import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { or, ilike, eq, desc, inArray, lte, gte, sql } from "drizzle-orm";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import { SupplierRepository } from "../../../database/repositories/supplier.repository.ts";
import { ProductRepository } from "../../../database/repositories/product.repository.ts";
import { ReceiptItemRepository } from "../../../database/repositories/receipt-item.repository.ts";
import { ProductInventoryLogRepository } from "../../../database/repositories/product-inventory-log.repository.ts";

import {
  productTable,
  type InsertProduct,
  type UpdateProduct,
} from "../../../database/schemas/product.schema.ts";
import { supplierTable } from "../../../database/schemas/supplier.schema.ts";
import {
  productSupplierTable,
  type InsertProductSupplier,
} from "../../../database/schemas/product-supplier.schema.ts";
import { receiptItemTable } from "../../../database/schemas/receipt-item.schema.ts";

import {
  getPagination,
  getPaginationMetadata,
  parseBodyJson,
} from "../../../common/utils/index.ts";
import { generateProductCode } from "../utils/product.util.ts";
import { generateSupplierCode } from "../../supplier/utils/supplier.util.ts";
import type { ResponseType } from "../../../common/types/index.d.ts";

import { database } from "../../../common/config/database.ts";
import { ProductStatus } from "../enums/product.enum.ts";
import { InventoryChangeType } from "../../../database/enums/inventory.enum.ts";

@singleton()
export default class ProductHandler {
  constructor(
    @inject(ProductRepository) private productRepository: ProductRepository,
    @inject(SupplierRepository) private supplierRepository: SupplierRepository,
    @inject(ReceiptItemRepository)
    private receiptItemRepository: ReceiptItemRepository,
    @inject(ProductInventoryLogRepository)
    private productInventoryLogRepository: ProductInventoryLogRepository
  ) {}

  async createProduct(ctx: Context) {
    const body = await parseBodyJson<
      InsertProduct & { suppliers?: Array<{ id: string; costPrice: number }> }
    >(ctx);
    const {
      category,
      productName,
      sellingPrice,
      costPrice,
      inventory,
      unit,
      suppliers,
      description,
      warehouse,
      status,
    } = body;

    const productCode = generateProductCode();

    // Start a transaction to handle both product and supplier relationships
    const result = await database.transaction(async (tx) => {
      // Create product first
      const { data: products } = await this.productRepository.createProduct(
        {
          productCode,
          productName,
          sellingPrice,
          costPrice,
          inventory,
          unit,
          category,
          description,
          warehouse,
          status,
        },
        tx
      );

      if (!products.length) {
        throw new Error("Can't create product");
      }

      const productId = products[0].id;

      // Create product-supplier relationships if suppliers are provided
      if (suppliers && suppliers.length > 0) {
        const productSuppliers: InsertProductSupplier[] = suppliers.map(
          (supplier) => ({
            productId,
            supplierId: supplier.id,
            costPrice: supplier.costPrice,
            createdAt: new Date().toISOString(),
          })
        );

        await tx.insert(productSupplierTable).values(productSuppliers);
      }

      return { id: productId, productCode };
    });

    return ctx.json({
      data: result,
      success: true,
      statusCode: 201,
    });
  }

  async updateProduct(ctx: Context) {
    const id = ctx.req.param("id");
    const body = await parseBodyJson<
      UpdateProduct & { suppliers?: Array<{ id: string; costPrice: number }> }
    >(ctx);
    const jwtPayload = ctx.get("jwtPayload");
    const userId = jwtPayload.sub;

    const {
      productName,
      status,
      category,
      sellingPrice,
      costPrice,
      inventory,
      suppliers,
      description,
      warehouse,
      unit,
    } = body;

    const { data: product } =
      await this.productRepository.findProductByIdentity(
        id,
        {
          select: {
            id: productTable.id,
            inventory: productTable.inventory,
          },
        },
      );
    if (!product) {
      throw new Error("Product not found");
    }

    const result = await database.transaction(async (tx) => {
      // Update product details
      const dataUpdate: Partial<UpdateProduct> = {
        updatedAt: dayjs().toISOString(),
      };

      if (productName) dataUpdate.productName = productName;
      if (status) dataUpdate.status = status;
      if (category) dataUpdate.category = category;
      if (sellingPrice) dataUpdate.sellingPrice = sellingPrice;
      if (costPrice) dataUpdate.costPrice = costPrice;
      if (inventory) dataUpdate.inventory = inventory;
      if (description) dataUpdate.description = description;
      if (warehouse) dataUpdate.warehouse = warehouse;
      if (unit) dataUpdate.unit = unit;

      const { data: productUpdated } =
        await this.productRepository.updateProduct(
          {
            set: dataUpdate,
            where: [eq(productTable.id, id)],
          },
          tx
        );

      if (!productUpdated.length) {
        throw new Error("Can't update product");
      }

      if (suppliers !== undefined) {
        // Delete existing relationships
        await tx
          .delete(productSupplierTable)
          .where(eq(productSupplierTable.productId, id));

        // Insert new relationships
        if (suppliers.length > 0) {
          const productSuppliers: InsertProductSupplier[] = suppliers.map(
            (supplier) => ({
              productId: id,
              supplierId: supplier.id,
              costPrice: supplier.costPrice,
              updatedAt: new Date().toISOString(),
            })
          );

          await tx.insert(productSupplierTable).values(productSuppliers);
        }
      }

      if (inventory !== undefined && inventory !== product.inventory) {
        const inventoryChange = product.inventory - (inventory as number);

        await this.productInventoryLogRepository.createLog(
          {
            productId: id,
            changeType: InventoryChangeType.MANUAL,
            previousInventory: product.inventory,
            inventoryChange,
            currentInventory: inventory as number,
            userId,
          },
          tx
        );
      }

      return { id };
    });

    return ctx.json({
      data: result,
      success: true,
      statusCode: 200,
    });
  }

  async deleteProduct(ctx: Context) {
    const id = ctx.req.param("id");

    const result = await database.transaction(async (tx) => {
      // Product-supplier relationships will be automatically deleted due to CASCADE
      const { data: product } = await this.productRepository.deleteProduct(
        id,
        tx
      );
      if (!product.length) {
        throw new Error("Product not found");
      }
      return product;
    });

    return ctx.json({
      data: result,
      success: true,
      statusCode: 204,
    });
  }

  async getProductById(ctx: Context) {
    const productId = ctx.req.param("id");

    const { data: product } =
      await this.productRepository.findProductByIdentity(productId, {
        select: {
          id: productTable.id,
          category: productTable.category,
          productCode: productTable.productCode,
          productName: productTable.productName,
          unit: productTable.unit,
          sellingPrice: productTable.sellingPrice,
          costPrice: productTable.costPrice,
          inventory: productTable.inventory,
          description: productTable.description,
          imageUrls: productTable.imageUrls,
          warehouse: productTable.warehouse,
          status: productTable.status,
          createdAt: productTable.createdAt,
          updatedAt: productTable.updatedAt,
          suppliers: sql`
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'costPrice', ps.cost_price
                  )
                )
                FROM ${productSupplierTable} ps
                LEFT JOIN ${supplierTable} s ON s.id = ps.supplier_id
                WHERE ps.product_id = ${productTable.id}
              ),
              '[]'::json
            )
          `,
        },
        withSuppliers: true,
      });

    if (!product) {
      throw new Error("Product not found");
    }

    return ctx.json({
      data: product,
      success: true,
      statusCode: 200,
    });
  }

  async getProductsByFilter(ctx: Context) {
    const query = ctx.req.query();
    const categories = ctx.req.queries("categories");
    const suppliers = ctx.req.queries("suppliers");
    const { keyword, status, maxPrice, minPrice, maxInventory } = query;
    const filters: any = [];

    if (keyword) {
      filters.push(
        or(
          ilike(productTable.productCode, `%${keyword}%`),
          ilike(productTable.productName, `%${keyword}%`)
        )
      );
    }

    if (categories && categories.length) {
      filters.push(inArray(productTable.category, categories));
    }

    if (suppliers && suppliers.length) {
      filters.push(inArray(productSupplierTable.supplierId, suppliers));
    }

    if (maxPrice) {
      filters.push(lte(productTable.sellingPrice, +maxPrice));
    }

    if (minPrice) {
      filters.push(gte(productTable.sellingPrice, +minPrice));
    }

    if (maxInventory) {
      filters.push(lte(productTable.inventory, +maxInventory));
    }

    if (status) {
      filters.push(eq(productTable.status, status));
    }

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

    try {
      const { data: products, count } =
        await this.productRepository.findProductsByCondition({
          select: {
            id: productTable.id,
            category: productTable.category,
            productCode: productTable.productCode,
            productName: productTable.productName,
            unit: productTable.unit,
            sellingPrice: productTable.sellingPrice,
            costPrice: productTable.costPrice,
            inventory: productTable.inventory,
            description: productTable.description,
            imageUrls: productTable.imageUrls,
            warehouse: productTable.warehouse,
            status: productTable.status,
            createdAt: productTable.createdAt,
            updatedAt: productTable.updatedAt,
            suppliers: sql`
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', s.id,
                      'name', s.name,
                      'costPrice', ps.cost_price
                    )
                  )
                  FROM ${productSupplierTable} ps
                  LEFT JOIN ${supplierTable} s ON s.id = ps.supplier_id
                  WHERE ps.product_id = ${productTable.id}
                ),
                '[]'::json
              )
            `,
          },
          where: filters,
          orderBy: [desc(productTable.createdAt)],
          limit,
          offset,
          isCount: true,
          withSuppliers: true,
        });

      const metadata = getPaginationMetadata(page, limit, offset, count!);

      return ctx.json({
        data: products,
        metadata,
        success: true,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getTotalProductAndInventory(ctx: Context) {
    const [totalProduct, totalInventory] = await Promise.all([
      this.productRepository.getTotalProducts(),
      this.productRepository.getTotalInventory(),
    ]);

    return ctx.json({
      data: {
        totalProduct,
        totalInventory,
      },
      success: true,
      statusCode: 200,
    });
  }

  async getReceiptHistoryOfProduct(ctx: Context) {
    const query = ctx.req.query();
    const { type, productId, page, limit } = query;
    const filters: any = [eq(receiptItemTable.productId, productId)];

    const {
      page: currentPage,
      limit: take,
      offset,
    } = getPagination({
      page: +(page || 1),
      limit: +(limit || 10),
    });

    const { data, count } =
      await this.receiptItemRepository.findReceiptItemsByProduct(type, {
        select: {},
        where: filters,
        limit: take,
        offset,
        isCount: true,
      });

    const metadata = getPaginationMetadata(currentPage, take, offset, count!);

    return ctx.json({
      data,
      metadata,
      success: true,
      statusCode: 200,
    });
  }

  async getCategories(ctx: Context) {
    const query = ctx.req.query();
    const { keyword, page, limit } = query;
    const filters: any = [];

    if (keyword) {
      filters.push(ilike(productTable.category, `%${keyword}%`));
    }

    const {
      page: currentPage,
      limit: take,
      offset,
    } = getPagination({
      page: +(page || 1),
      limit: +(limit || 10),
    });

    const { data, count } =
      await this.productRepository.findCategoriesByCondition({
        select: {},
        where: filters,
        limit: take,
        offset,
        isCount: true,
      });

    const metadata = getPaginationMetadata(currentPage, take, offset, count!);

    return ctx.json({
      data,
      metadata,
      success: true,
      statusCode: 200,
    });
  }

  async getUnits(ctx: Context) {
    const { data } = await this.productRepository.findUnitByCondition({
      select: {},
      where: [],
    });

    return ctx.json({
      data,
      success: true,
      statusCode: 200,
    });
  }

  async parseExcelFile(file: File) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  async importProducts(ctx: Context) {
    try {
      // const query = ctx.req.query();
      const body = await ctx.req.parseBody();

      if (body["file"] instanceof File) {
        const file = body["file"];
        console.log(`Got file sized: ${file.size}`);

        const result: ResponseType = await new Promise((resolve) => {
          const reader = new FileReader();

          reader.onload = async (event: ProgressEvent<FileReader>) => {
            if (!event.target) {
              return resolve({
                success: false,
                message: "Event target not found",
                statusCode: 500,
              });
            }

            const workbook = XLSX.read(event.target.result, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const sheetData: any[] = XLSX.utils.sheet_to_json(sheet);
            console.log({ SHEET_DATA_LENGTH: sheetData.length });

            const batchSize = 500;
            const batches: any[] = [];

            for (let i = 0; i < sheetData.length; i += batchSize) {
              batches.push(sheetData.slice(i, i + batchSize));
            }

            await database.transaction(async (tx) => {
              for (const batch of batches) {
                const productsAsync = batch.map(async (row) => {
                  const productCode = generateProductCode();
                  const costPrice = row["Giá vốn"];
                  const suppliers = row["Nhà Cung Cấp"];
                  let productSuppliers: InsertProductSupplier[] = [];

                  if (suppliers) {
                    // Split and get unique supplier names
                    const supplierNames = [
                      ...new Set(
                        suppliers.split(";").map((name) => name.trim())
                      ),
                    ] as string[];

                    // First, collect all unique suppliers and create/update them in a single batch
                    const uniqueSuppliers = new Map();
                    for (const name of supplierNames) {
                      if (!uniqueSuppliers.has(name)) {
                        uniqueSuppliers.set(name, {
                          code: generateSupplierCode(),
                          name,
                        });
                      }
                    }

                    // Create/update all suppliers at once
                    const { data: newSuppliers } =
                      await this.supplierRepository.createSupplierOnConflictDoUpdate(
                        Array.from(uniqueSuppliers.values()),
                        tx
                      );

                    // Map supplier names to their IDs for later use
                    const supplierNameToId = new Map(
                      newSuppliers.map((supplier, index) => [
                        Array.from(uniqueSuppliers.keys())[index],
                        supplier.id,
                      ])
                    );

                    // Now map the original supplier names to their IDs and cost prices
                    productSuppliers = supplierNames.map((name) => ({
                      productId: "",
                      supplierId: supplierNameToId.get(name) as string,
                      costPrice,
                    }));
                  }

                  const product: Record<string, string | number> = {
                    productCode,
                    productName: row["Tên hàng"],
                    costPrice,
                    sellingPrice: row["Giá bán"],
                    inventory: row["Tồn kho"],
                    unit: row["ĐVT"],
                    category: row["Nhóm hàng"],
                    description: row["Mô tả"],
                    note: row["Ghi chú"],
                    imageUrls: row["Hình ảnh"]?.split(",") ?? [],
                    warehouse: row["Vị trí"],
                    status: ProductStatus.ACTIVE,
                  };

                  return { product, productSuppliers };
                });

                const productsAndSuppliers = await Promise.all(productsAsync);

                // Insert products first
                const createdProducts =
                  await this.productRepository.createProductOnConflictDoNothing(
                    productsAndSuppliers.map((item) => item.product),
                    tx
                  );

                // Insert product-supplier relationships
                const productSuppliersAsync = createdProducts.map(
                  async (product, index) => {
                    const productSuppliers =
                      productsAndSuppliers[index].productSuppliers;

                    if (productSuppliers.length) {
                      const productSupplierValues = productSuppliers.map(
                        (supplier) => ({
                          ...supplier,
                          productId: product.id,
                        })
                      );

                      await tx
                        .insert(productSupplierTable)
                        .values(productSupplierValues);
                    }
                  }
                );

                await Promise.all(productSuppliersAsync);
                // End of batch processing
              }
            });

            resolve({
              success: true,
              statusCode: 200,
            });
          };

          reader.readAsArrayBuffer(file);
        });

        return ctx.json(result);
      } else {
        return ctx.json({
          success: false,
          message: "File not found",
          statusCode: 400,
        });
      }
    } catch (error) {
      return ctx.json({
        success: false,
        message: (error as Error).message,
        statusCode: 500,
        error,
      });
    }
  }

  async exportProductsToExcelFile(ctx: Context) {
    const { data } = await this.productRepository.findProductsByCondition({
      select: {
        id: productTable.id,
        category: productTable.category,
        productCode: productTable.productCode,
        productName: productTable.productName,
        unit: productTable.unit,
        sellingPrice: productTable.sellingPrice,
        costPrice: productTable.costPrice,
        inventory: productTable.inventory,
        description: productTable.description,
        imageUrls: productTable.imageUrls,
        warehouse: productTable.warehouse,
        status: productTable.status,
        createdAt: productTable.createdAt,
        updatedAt: productTable.updatedAt,
      },
      where: [],
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    // Write workbook to a file
    XLSX.writeFile(workbook, "exported_data.xlsx");

    return ctx.json({
      success: true,
      statusCode: 200,
    });
  }
}
