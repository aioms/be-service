import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { or, ilike, eq, desc } from "drizzle-orm";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import { ProductRepository } from "../../../database/repositories/product.repository.ts";
import { ProductStatus } from "../enums/product.enum.ts";
import {
  productTable,
  type InsertProduct,
  type UpdateProduct,
} from "../../../database/schemas/product.schema.ts";
import {
  getPagination,
  getPaginationMetadata,
  parseBodyJson,
} from "../../../common/utils/index.ts";
import { generateProductCode } from "../utils/product.util.ts";
import { ResponseType } from "../../../common/types/index.d.ts";

@singleton()
export default class ProductHandler {
  constructor(
    @inject(ProductRepository) private productRepository: ProductRepository,
  ) {}

  async createProduct(ctx: Context) {
    const body = await parseBodyJson<InsertProduct>(ctx);
    const {
      category,
      productName,
      sellingPrice,
      costPrice,
      inventory,
      unit,
      supplier,
      additionalDescription,
      warehouseLocation,
      status,
    } = body;

    const { data: lastIndex } = await this.productRepository.getLastIndex();
    const productCode = generateProductCode(lastIndex!);

    const { data: products } = await this.productRepository.createProduct({
      index: lastIndex! + 1,
      productCode,
      productName,
      sellingPrice,
      costPrice,
      inventory,
      unit,
      category,
      supplier,
      additionalDescription,
      warehouseLocation,
      status,
    });

    if (!products.length) {
      throw new Error("Can't create product");
    }

    return ctx.json({
      data: { id: products[0].id, productCode },
      success: true,
      statusCode: 201,
    });
  }

  async updateProduct(ctx: Context) {
    const id = ctx.req.param("id");
    const body = await parseBodyJson<UpdateProduct>(ctx);

    const {
      productName,
      status,
      category,
      sellingPrice,
      costPrice,
      inventory,
      supplier,
      additionalDescription,
      warehouseLocation,
      unit,
    } = body;

    const dataUpdate: Partial<UpdateProduct> = {
      updatedAt: dayjs().toISOString(),
    };

    if (productName) dataUpdate.productName = productName;
    if (status) dataUpdate.status = status;
    if (category) dataUpdate.category = category;
    if (sellingPrice) dataUpdate.sellingPrice = sellingPrice;
    if (costPrice) dataUpdate.costPrice = costPrice;
    if (inventory) dataUpdate.inventory = inventory;
    if (supplier) dataUpdate.supplier = supplier;
    if (additionalDescription)
      dataUpdate.additionalDescription = additionalDescription;
    if (warehouseLocation) dataUpdate.warehouseLocation = warehouseLocation;
    if (unit) dataUpdate.unit = unit;

    const { data: productUpdated } = await this.productRepository.updateProduct(
      {
        set: dataUpdate,
        where: [eq(productTable.id, id)],
      },
    );

    if (!productUpdated.length) {
      throw new Error("Can't update product");
    }

    return ctx.json({
      data: { id },
      success: true,
      statusCode: 200,
    });
  }

  async deleteProduct(ctx: Context) {
    const id = ctx.req.param("id");

    const { data: product } = await this.productRepository.deleteProduct(id);
    if (!product.length) {
      throw new Error("Product not found");
    }

    return ctx.json({
      data: product,
      success: true,
      statusCode: 204,
    });
  }

  async getProductById(ctx: Context) {
    const productId = ctx.req.param("id");

    const { data: product } = await this.productRepository.findProductById(
      productId,
      {
        select: {
          id: productTable.id,
          category: productTable.category,
          productCode: productTable.productCode,
          productName: productTable.productName,
          unit: productTable.unit,
          sellingPrice: productTable.sellingPrice,
          costPrice: productTable.costPrice,
          inventory: productTable.inventory,
          supplier: productTable.supplier,
          additionalDescription: productTable.additionalDescription,
          imageUrls: productTable.imageUrls,
          warehouseLocation: productTable.warehouseLocation,
          status: productTable.status,
          createdAt: productTable.createdAt,
          updatedAt: productTable.updatedAt,
        },
      },
    );
    if (!product) {
      throw new Error("product not found");
    }

    return ctx.json({
      data: product,
      success: true,
      statusCode: 200,
    });
  }

  async getProductsByFilter(ctx: Context) {
    const query = ctx.req.query();
    const { keyword, status } = query;
    const filters: any = [];

    if (keyword) {
      filters.push(
        or(
          ilike(productTable.productCode, `%${keyword}%`),
          ilike(productTable.productName, `%${keyword}%`),
        ),
      );
    }

    if (status) {
      filters.push(eq(productTable.status, status));
    }

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

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
          supplier: productTable.supplier,
          additionalDescription: productTable.additionalDescription,
          imageUrls: productTable.imageUrls,
          warehouseLocation: productTable.warehouseLocation,
          status: productTable.status,
          createdAt: productTable.createdAt,
          updatedAt: productTable.updatedAt,
        },
        where: filters,
        orderBy: [desc(productTable.index)],
        limit,
        offset,
        isCount: true,
      });

    const metadata = getPaginationMetadata(page, limit, offset, count!);

    return ctx.json({
      data: products,
      metadata,
      success: true,
      statusCode: 200,
    });
  }

  async getCategories(ctx: Context) {
    const { data } = await this.productRepository.findCategoriesByCondition({
      select: {},
      where: [],
    });

    return ctx.json({
      data,
      success: true,
      statusCode: 200,
    });
  }

  async getSuppliers(ctx: Context) {
    const { data } = await this.productRepository.findSuppliersByCondition({
      select: {},
      where: [],
    });

    return ctx.json({
      data,
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
    // const jwtPayload = ctx.get("jwtPayload");
    // const userId = jwtPayload.sub;

    const query = ctx.req.query();
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

          for (const row of sheetData) {
            const code = row["Mã hàng"];
            const [, index] = code.split("NK");

            if (!index || isNaN(index)) {
              return resolve({
                success: false,
                message: `Product code invalid: ${code}`,
                statusCode: 400,
              });
            }

            const count = parseInt(index);
            const productCode = generateProductCode(count - 1);

            const product = {
              index: count,
              productCode,
              productName: row["Tên hàng"],
              sellingPrice: row["Giá bán"],
              costPrice: row["Giá vốn"],
              inventory: row["Tồn kho"],
              unit: row["ĐVT"],
              category: row["Nhóm hàng(3 Cấp)"],
              supplier: row["Nhà Cung Cấp"],
              additionalDescription: row["Mô tả thêm"],
              imageUrls: row["Hình ảnh (url1,url2...)"]?.split(",") ?? [],
              warehouseLocation: row["Vị trí"],
              status: ProductStatus.ACTIVE,
            };

            // Check for duplicates based on product_code
            if (query.type === "2") {
              await this.productRepository.createProductOnConflictDoUpdate(
                product,
              );
            } else {
              await this.productRepository.createProductOnConflictDoNothing(
                product,
              );
            }
          }

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
        supplier: productTable.supplier,
        additionalDescription: productTable.additionalDescription,
        imageUrls: productTable.imageUrls,
        warehouseLocation: productTable.warehouseLocation,
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
