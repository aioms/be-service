import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { desc, eq, ilike, or } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

// REPOSITORY
import { SupplierRepository } from "../../../database/repositories/supplier.repository.ts";
import { ProductRepository } from "../../../database/repositories/product.repository.ts";
import { ReceiptImportRepository } from "../../../database/repositories/receipt-import.repository.ts";
import { ReceiptReturnRepository } from "../../../database/repositories/receipt-return.repository.ts";

// SCHEMA
import {
  supplierTable,
  type InsertSupplier,
  type UpdateSupplier,
} from "../../../database/schemas/supplier.schema.ts";
import { productTable } from "../../../database/schemas/product.schema.ts";
import { receiptImportTable } from "../../../database/schemas/receipt-import.schema.ts";
import { receiptReturnTable } from "../../../database/schemas/receipt-return.schema.ts";

// DTO
import {
  CreateSupplierRequestDto,
  UpdateSupplierRequestDto,
} from "../dtos/supplier.dto.ts";

import {
  getPagination,
  getPaginationMetadata,
  parseBodyJson,
} from "../../../common/utils/index.ts";
import { SupplierStatus } from "../enums/supplier.enum.ts";
import { ResponseType } from "../../../common/types/index.d.ts";
import { database } from "../../../common/config/database.ts";

@singleton()
export default class SupplierHandler {
  constructor(
    @inject(SupplierRepository)
    private supplierRepository: SupplierRepository,
    @inject(ProductRepository)
    private productRepository: ProductRepository,
    @inject(ReceiptImportRepository)
    private receiptImportRepository: ReceiptImportRepository,
    @inject(ReceiptReturnRepository)
    private receiptReturnRepository: ReceiptReturnRepository,
  ) {}

  async createSupplier(ctx: Context) {
    const body = await parseBodyJson<CreateSupplierRequestDto>(ctx);
    const { name, email, phone, address, company, note, taxCode, status } =
      body;

    const random = customAlphabet("1234567890", 10);
    const code = `NCC${random()}`;

    const newRecord: InsertSupplier = {
      code,
      name,
      email,
      phone,
      address,
      company,
      taxCode,
      note,
      status: status || SupplierStatus.COLLABORATING,
    };
    const { data } = await this.supplierRepository.createSupplier(newRecord);

    if (!data.length) {
      throw new Error("Can't create supplier");
    }

    return ctx.json({
      data: { id: data[0].id, code },
      success: true,
      statusCode: 201,
    });
  }

  async updateSupplier(ctx: Context) {
    const id = ctx.req.param("id");
    const body = await parseBodyJson<UpdateSupplierRequestDto>(ctx);
    const { name, email, phone, company, note, taxCode, address, status } =
      body;

    const dataUpdate: UpdateSupplier = {
      updatedAt: dayjs().toISOString(),
    };

    name && (dataUpdate.name = name);
    email && (dataUpdate.email = email);
    phone && (dataUpdate.phone = phone);
    company && (dataUpdate.company = company);
    note && (dataUpdate.note = note);
    taxCode && (dataUpdate.taxCode = taxCode);
    address && (dataUpdate.address = address);
    status && (dataUpdate.status = status);

    const { data } = await this.supplierRepository.updateSupplier({
      set: dataUpdate,
      where: [eq(supplierTable.id, id)],
    });

    if (!data.length) {
      throw new Error("Can't update receipt check");
    }

    return ctx.json({
      data: { id },
      success: true,
      statusCode: 200,
    });
  }

  async deleteSupplier(ctx: Context) {
    const id = ctx.req.param("id");

    const { data } = await this.supplierRepository.deleteSupplier(id);
    if (!data.length) {
      throw new Error("Supplier not found");
    }

    return ctx.json({
      data,
      success: true,
      statusCode: 204,
    });
  }

  async getSupplierById(ctx: Context) {
    const id = ctx.req.param("id");

    const { data: supplier } = await this.supplierRepository.findSupplierById(
      id,
      {
        select: {
          id: supplierTable.id,
          code: supplierTable.code,
          name: supplierTable.name,
          email: supplierTable.email,
          phone: supplierTable.phone,
          company: supplierTable.company,
          taxCode: supplierTable.taxCode,
          address: supplierTable.address,
          note: supplierTable.note,
          totalDebt: supplierTable.totalDebt,
          totalPurchased: supplierTable.totalPurchased,
          status: supplierTable.status,
          createdAt: supplierTable.createdAt,
          updatedAt: supplierTable.updatedAt,
        },
      }
    );

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    return ctx.json({
      data: supplier,
      success: true,
      statusCode: 200,
    });
  }

  async getSuppliersByFilter(ctx: Context) {
    const query = ctx.req.query();

    const { keyword, status } = query;
    const filters: any = [];

    if (keyword) {
      filters.push(
        or(
          ilike(supplierTable.code, `%${keyword}%`),
          ilike(supplierTable.name, `%${keyword}%`),
          ilike(supplierTable.email, `%${keyword}%`),
          ilike(supplierTable.phone, `%${keyword}%`)
        )
      );
    }

    if (status) {
      filters.push(eq(supplierTable.status, status));
    }

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

    const { data: suppliers, count } =
      await this.supplierRepository.findSuppliersByCondition({
        select: {
          id: supplierTable.id,
          code: supplierTable.code,
          name: supplierTable.name,
          email: supplierTable.email,
          phone: supplierTable.phone,
          company: supplierTable.company,
          taxCode: supplierTable.taxCode,
          address: supplierTable.address,
          note: supplierTable.note,
          status: supplierTable.status,
          createdAt: supplierTable.createdAt,
        },
        where: filters,
        orderBy: [desc(supplierTable.createdAt)],
        limit,
        offset,
        isCount: true,
      });

    const metadata = getPaginationMetadata(page, limit, offset, count!);

    return ctx.json({
      data: suppliers,
      metadata,
      success: true,
      statusCode: 200,
    });
  }

  async getProductsBySupplier(ctx: Context) {
    const supplierId = ctx.req.param("id");
    const query = ctx.req.query();
    const { keyword } = query;
    const filters: any = [
      eq(productTable.supplier, supplierId),
    ];

    if (keyword) {
      filters.push(
        or(
          ilike(productTable.productCode, `%${keyword}%`),
          ilike(productTable.productName, `%${keyword}%`),
        ),
      );
    }

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

    const { data: products, count } =
      await this.productRepository.findProductsByCondition({
        select: {
          id: productTable.id,
          productCode: productTable.productCode,
          productName: productTable.productName,
          costPrice: productTable.costPrice,
          inventory: productTable.inventory,
          status: productTable.status,
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

  async getReceiptsImportBySupplier(ctx: Context) {
    const supplierId = ctx.req.param("id");
    const query = ctx.req.query();
    const filters: any = [
      eq(receiptImportTable.supplier, supplierId),
    ];

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

    const { data: receipts, count } =
      await this.receiptImportRepository.findReceiptsImportByCondition({
        select: {
          id: receiptImportTable.id,
          receiptNumber: receiptImportTable.receiptNumber,
          quantity: receiptImportTable.quantity,
          totalProduct: receiptImportTable.totalProduct,
          totalAmount: receiptImportTable.totalAmount,
          paymentDate: receiptImportTable.paymentDate,
          expectedImportDate: receiptImportTable.expectedImportDate,
          status: receiptImportTable.status,
        },
        where: filters,
        orderBy: [desc(receiptImportTable.createdAt)],
        limit,
        offset,
        isCount: true,
      });

    const metadata = getPaginationMetadata(page, limit, offset, count!);

    return ctx.json({
      data: receipts,
      metadata,
      success: true,
      statusCode: 200,
    });
  }

  async getReceiptsReturnBySupplier(ctx: Context) {
    const supplierId = ctx.req.param("id");
    const query = ctx.req.query();
    const filters: any = [
      eq(receiptReturnTable.supplier, supplierId),
    ];

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

    const { data: receipts, count } =
      await this.receiptReturnRepository.findReceiptsReturnByCondition({
        select: {
          id: receiptReturnTable.id,
          receiptNumber: receiptReturnTable.receiptNumber,
          quantity: receiptReturnTable.quantity,
          totalProduct: receiptReturnTable.totalProduct,
          totalAmount: receiptReturnTable.totalAmount,
          returnDate: receiptReturnTable.returnDate,
          status: receiptReturnTable.status,
        },
        where: filters,
        orderBy: [desc(receiptReturnTable.createdAt)],
        limit,
        offset,
        isCount: true,
      });

    const metadata = getPaginationMetadata(page, limit, offset, count!);

    return ctx.json({
      data: receipts,
      metadata,
      success: true,
      statusCode: 200,
    });
  }

  async importSuppliers(ctx: Context) {
    try {
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

            const batchSize = 1000;
            const batches: any[] = [];

            for (let i = 0; i < sheetData.length; i += batchSize) {
              batches.push(sheetData.slice(i, i + batchSize));
            }

            await database.transaction(async (tx) => {
              for (const batch of batches) {
                const items = batch.map((row) => {
                  const item = {
                    code: row["Mã nhà cung cấp"],
                    name: row["Tên nhà cung cấp"],
                    phone: row["Điện thoại"],
                    email: row["Email"],
                    address: row["Địa chỉ"],
                    company: row["Công ty phụ trách"],
                    taxCode: row["Mã số thuế"],
                    note: row["Ghi chú"],
                    totalDebt: row["Công nợ hiện tại"],
                    totalPurchased: row["Tổng mua trừ trả hàng"],
                    status: SupplierStatus.COLLABORATING,
                  };

                  return item;
                });

                if (query.type === "2") {
                  await this.supplierRepository.createSupplierOnConflictDoUpdate(
                    items,
                    tx
                  );
                } else {
                  await this.supplierRepository.createSupplierOnConflictDoNothing(
                    items,
                    tx
                  );
                }
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
}
