import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { or, ilike, eq, desc, asc } from "drizzle-orm";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import { ProductRepository } from "../../../database/repositories/product.repository.ts";
import { ProductStatus } from "../enums/product.enum.ts";
import {
  productTable,
  type UpdateProduct,
} from "../../../database/schemas/product.schema.ts";
import {
  getPagination,
  getPaginationMetadata,
  parseBodyJson,
} from "../../../common/utils/index.ts";

@singleton()
export default class ProductHandler {
  constructor(
    @inject(ProductRepository) private productRepository: ProductRepository,
  ) {}

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

    const dataUpdate: UpdateProduct = {
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
          ilike(productTable.productCode, keyword),
          ilike(productTable.productName, keyword),
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
        orderBy: [asc(productTable.productCode)],
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

  async parseExcelFile(file: File) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  async importProducts(ctx: Context) {
    // const jwtPayload = ctx.get("jwtPayload");
    // const userId = jwtPayload.sub;

    const body = await ctx.req.parseBody();

    if (body["file"] instanceof File) {
      const file = body["file"];
      console.log(`Got file sized: ${file.size}`);

      await new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = async (event: ProgressEvent<FileReader>) => {
          if (!event.target) {
            return resolve({
              success: false,
              statusCode: 500,
            });
          }

          const workbook = XLSX.read(event.target.result, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const sheetData: any[] = XLSX.utils.sheet_to_json(sheet);

          for (const row of sheetData) {
            const product = {
              category: row["Nhóm hàng(3 Cấp)"],
              productCode: row["Mã hàng"],
              productName: row["Tên hàng"],
              sellingPrice: row["Giá bán"],
              costPrice: row["Giá vốn"],
              inventory: row["Tồn kho"],
              unit: row["ĐVT"],
              supplier: row["Nhà Cung Cấp"],
              additionalDescription: row["Mô tả thêm"],
              imageUrls: row["Hình ảnh (url1,url2...)"]?.split(",") ?? [],
              warehouseLocation: row["Vị trí"],
              status: ProductStatus.active,
            };

            // Check for duplicates based on product_code
            await this.productRepository.createProductOnConflictDoUpdate(
              product,
            );
          }

          resolve({
            success: true,
            statusCode: 200,
          });
        };

        reader.readAsArrayBuffer(file);
      });

      return ctx.json({
        success: true,
        statusCode: 200,
      });
    } else {
      return ctx.json({
        success: false,
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
