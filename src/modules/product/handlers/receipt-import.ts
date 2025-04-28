import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { between, desc, eq, ilike, or } from "drizzle-orm";
import dayjs from "dayjs";

// REPOSITORY
import { ReceiptImportRepository } from "../../../database/repositories/receipt-import.repository.ts";
import { ReceiptItemRepository } from "../../../database/repositories/receipt-item.repository.ts";

// SCHEMA
import {
  InsertReceiptImport,
  receiptImportTable,
  UpdateReceiptImport,
} from "../../../database/schemas/receipt-import.schema.ts";
import { receiptItemTable } from "../../../database/schemas/receipt-item.schema.ts";
import { supplierTable } from "../../../database/schemas/supplier.schema.ts";

// DTO
import {
  CreateReceiptImportRequestDto,
  UpdateReceiptImportRequestDto,
} from "../dtos/receipt-import.dto.ts";

import {
  getPagination,
  getPaginationMetadata,
  parseBodyJson,
} from "../../../common/utils/index.ts";
import { database } from "../../../common/config/database.ts";
import { UserActivityRepository } from "../../../database/repositories/user-activity.repository.ts";
import { PgTx } from "../../../database/custom/data-types.ts";
import { UserActivityType } from "../../../database/enums/user-activity.enum.ts";

@singleton()
export default class ReceiptImportHandler {
  constructor(
    @inject(ReceiptImportRepository)
    private receiptRepository: ReceiptImportRepository,
    @inject(ReceiptItemRepository)
    private receiptItemRepository: ReceiptItemRepository,
    @inject(UserActivityRepository)
    private userActivityRepository: UserActivityRepository
  ) {}

  async createReceipt(ctx: Context) {
    const jwtPayload = ctx.get("jwtPayload");
    const userId = jwtPayload.sub;

    const body = await parseBodyJson<CreateReceiptImportRequestDto>(ctx);
    const {
      note,
      quantity,
      totalAmount,
      totalProduct,
      supplier,
      warehouse,
      paymentDate,
      expectedImportDate,
      status,
      items,
    } = body;

    const receiptId = await database.transaction(async (tx) => {
      const receiptNumber = `NH${dayjs().format("YYMMDDHHmm")}`;
      const receiptImportData: InsertReceiptImport = {
        receiptNumber,
        note,
        quantity,
        totalAmount,
        totalProduct,
        supplier,
        warehouse,
        paymentDate,
        expectedImportDate,
        status,
        userCreated: userId,
      };
      const { data, error } = await this.receiptRepository.createReceiptImport(
        receiptImportData,
        tx
      );

      if (error || !data) {
        throw new Error(error);
      }

      // Create receipt items
      const receiptId = data.id;
      await this.createReceiptItems(receiptId, items, tx);

      await this.userActivityRepository.createActivity(
        {
          userId: userId,
          description: `Vừa tạo 1 phiếu nhập ${receiptNumber}`,
          type: UserActivityType.RECEIPT_IMPORT_CREATED,
          referenceId: receiptId,
        },
        tx
      );

      return receiptId;
    });

    return ctx.json({
      data: { id: receiptId },
      success: true,
      statusCode: 201,
    });
  }

  async updateReceipt(ctx: Context) {
    const jwtPayload = ctx.get("jwtPayload");
    const id = ctx.req.param("id");
    const body = await parseBodyJson<UpdateReceiptImportRequestDto>(ctx);
    const { items, ...newReceiptImportData } = body;
    const { fullname } = jwtPayload;

    const dataUpdate: UpdateReceiptImport = {
      ...newReceiptImportData,
      updatedAt: dayjs().toISOString(),
    };

    await database.transaction(async (tx) => {
      const { data: receipt } =
        await this.receiptRepository.findReceiptImportById(id, {
          select: {
            status: receiptImportTable.status,
            changeLog: receiptImportTable.changeLog,
          },
        });

      if (!receipt) {
        throw new Error("Receipt not found");
      }

      if (newReceiptImportData.status !== receipt.status) {
        // Update status change logs
        const changeLog = receipt.changeLog || [];
        changeLog.push({
          user: fullname,
          oldStatus: receipt.status,
          newStatus: newReceiptImportData.status,
          timestamp: dayjs().toISOString(),
        });

        dataUpdate.changeLog = changeLog;
      }

      const { data } = await this.receiptRepository.updateReceiptImport(
        {
          set: dataUpdate,
          where: [eq(receiptImportTable.id, id)],
        },
        tx
      );

      if (!data.length) {
        throw new Error("Can't update receipt import");
      }

      if (items && items.length) {
        // Delete old receipt items
        await this.receiptItemRepository.deleteReceiptItemByReceiptId(id, tx);

        // Create receipt items
        const receiptItemsData = items.map((item) => ({
          ...item,
          receiptId: id,
        }));

        // return ids[]
        await this.receiptItemRepository.createReceiptItem(
          receiptItemsData,
          tx
        );
      }
    });

    return ctx.json({
      data: { id },
      success: true,
      statusCode: 200,
    });
  }

  async deleteReceipt(ctx: Context) {
    const id = ctx.req.param("id");

    const result = await database.transaction(async (tx) => {
      const { data } = await this.receiptRepository.deleteReceiptImport(id, tx);
      if (!data.length) {
        throw new Error("Receipt not found");
      }

      // Delete receipt items
      await this.receiptItemRepository.deleteReceiptItemByReceiptId(id, tx);

      return data;
    });

    return ctx.json({
      data: result,
      success: true,
      statusCode: 204,
    });
  }

  async getReceiptById(ctx: Context) {
    const receiptId = ctx.req.param("id");

    const { data: receipt } =
      await this.receiptRepository.findReceiptImportById(receiptId, {
        select: {
          id: receiptImportTable.id,
          receiptNumber: receiptImportTable.receiptNumber,
          note: receiptImportTable.note,
          quantity: receiptImportTable.quantity,
          totalProduct: receiptImportTable.totalProduct,
          totalAmount: receiptImportTable.totalAmount,
          supplier: {
            id: supplierTable.id,
            name: supplierTable.name,
          },
          warehouse: receiptImportTable.warehouse,
          paymentDate: receiptImportTable.paymentDate,
          expectedImportDate: receiptImportTable.expectedImportDate,
          changeLog: receiptImportTable.changeLog,
          status: receiptImportTable.status,
          createdAt: receiptImportTable.createdAt,
        },
      });

    if (!receipt) {
      throw new Error("receipt not found");
    }

    const { data: receiptItems } =
      await this.receiptItemRepository.findReceiptItemsByCondition({
        select: {
          id: receiptItemTable.id,
          productCode: receiptItemTable.productCode,
          productName: receiptItemTable.productName,
          quantity: receiptItemTable.quantity,
          costPrice: receiptItemTable.costPrice,
        },
        where: [eq(receiptItemTable.receiptId, receiptId)],
      });

    return ctx.json({
      data: {
        receipt,
        items: receiptItems,
      },
      success: true,
      statusCode: 200,
    });
  }

  async getReceiptItemsByBarcode(ctx: Context) {
    const receiptNumber = ctx.req.param("receiptNumber");

    const { data: receipt } =
      await this.receiptRepository.findReceiptImportByReceiptNumber(
        receiptNumber,
        {
          select: {
            id: receiptImportTable.id,
            receiptNumber: receiptImportTable.receiptNumber,
          },
        }
      );

    if (!receipt) {
      throw new Error("receipt not found");
    }

    const { data: receiptItems } =
      await this.receiptItemRepository.findReceiptItemsByCondition({
        select: {
          id: receiptItemTable.id,
          productCode: receiptItemTable.productCode,
          productName: receiptItemTable.productName,
          quantity: receiptItemTable.quantity,
          costPrice: receiptItemTable.costPrice,
        },
        where: [eq(receiptItemTable.receiptId, receipt.id)],
      });

    return ctx.json({
      data: {
        receipt,
        items: receiptItems,
      },
      success: true,
      statusCode: 200,
    });
  }

  async getReceiptsByFilter(ctx: Context) {
    const query = ctx.req.query();

    const { keyword, status, importDate } = query;
    const filters: any = [];

    if (keyword) {
      filters.push(
        or(
          ilike(receiptImportTable.receiptNumber, `%${keyword}%`),
          ilike(receiptImportTable.supplier, `%${keyword}%`)
        )
      );
    }

    if (status) {
      filters.push(eq(receiptImportTable.status, status));
    }

    if (importDate) {
      const start = dayjs(importDate).startOf("day").format();
      const end = dayjs(importDate).endOf("day").format();
      filters.push(between(receiptImportTable.expectedImportDate, start, end));
    }

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

    const { data: receipts, count } =
      await this.receiptRepository.findReceiptsImportByCondition({
        select: {
          id: receiptImportTable.id,
          receiptNumber: receiptImportTable.receiptNumber,
          note: receiptImportTable.note,
          quantity: receiptImportTable.quantity,
          totalProduct: receiptImportTable.totalProduct,
          totalAmount: receiptImportTable.totalAmount,
          supplier: {
            id: supplierTable.id,
            name: supplierTable.name,
          },
          warehouse: receiptImportTable.warehouse,
          paymentDate: receiptImportTable.paymentDate,
          expectedImportDate: receiptImportTable.expectedImportDate,
          status: receiptImportTable.status,
          createdAt: receiptImportTable.createdAt,
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

  async getTotalImportsByDateRange(ctx: Context) {
    const query = ctx.req.query();
    const { startDate, endDate } = query;

    const total = await this.receiptRepository.getTotalImportsByDateRange(
      startDate,
      endDate
    );

    return ctx.json({
      data: total,
      success: true,
      statusCode: 200,
    });
  }

  /**
   * Private methods
   */

  private async createReceiptItems(
    receiptId: string,
    items: Array<{
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      costPrice: number;
    }>,
    tx: PgTx
  ): Promise<void> {
    const receiptItemsData = items.map((item) => ({
      ...item,
      receiptId,
    }));
    await this.receiptItemRepository.createReceiptItem(receiptItemsData, tx);
  }
}
