import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { between, desc, eq, ilike, or } from "drizzle-orm";
import dayjs from "dayjs";

// REPOSITORY
import { ReceiptReturnRepository } from "../../../database/repositories/receipt-return.repository.ts";
import { ReceiptItemRepository } from "../../../database/repositories/receipt-item.repository.ts";

// SCHEMA
import {
  InsertReceiptReturn,
  receiptReturnTable,
  UpdateReceiptReturn,
} from "../../../database/schemas/receipt-return.schema.ts";
import { receiptItemTable } from "../../../database/schemas/receipt-item.schema.ts";
import { supplierTable } from "../../../database/schemas/supplier.schema.ts";

// DTO
import {
  CreateReceiptReturnRequestDto,
  UpdateReceiptReturnRequestDto,
} from "../dtos/receipt-return.dto.ts";

import {
  getPagination,
  getPaginationMetadata,
  parseBodyJson,
} from "../../../common/utils/index.ts";
import { database } from "../../../common/config/database.ts";

@singleton()
export default class ReceiptReturnHandler {
  constructor(
    @inject(ReceiptReturnRepository)
    private receiptRepository: ReceiptReturnRepository,
    @inject(ReceiptItemRepository)
    private receiptItemRepository: ReceiptItemRepository,
  ) {}

  async createReceipt(ctx: Context) {
    const jwtPayload = ctx.get("jwtPayload");
    const userId = jwtPayload.sub;

    const body = await parseBodyJson<CreateReceiptReturnRequestDto>(ctx);
    const {
      name,
      note,
      quantity,
      totalAmount,
      totalProduct,
      warehouse,
      supplier,
      returnDate,
      type,
      reason,
      status,
      items,
    } = body;

    const receiptId = await database.transaction(async (tx) => {
      const receiptNumber = `TH${dayjs().format("YYMMDDHHmm")}`;
      const receiptReturnData: InsertReceiptReturn = {
        receiptNumber,
        name,
        note,
        quantity,
        totalAmount,
        totalProduct,
        warehouse,
        supplier,
        returnDate,
        type,
        reason,
        status,
        userCreated: userId,
      };

      const { data } = await this.receiptRepository.createReceiptReturn(
        receiptReturnData,
        tx,
      );

      if (!data.length) {
        throw new Error("Can't create receipt");
      }

      const receiptId = data[0].id;

      // Create receipt items
      const receiptItemsData = items.map((item) => ({
        ...item,
        receiptId,
      }));
      await this.receiptItemRepository.createReceiptItem(receiptItemsData, tx);

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
    const body = await parseBodyJson<UpdateReceiptReturnRequestDto>(ctx);
    const { items, ...newReceiptReturnData } = body;
    const { fullname } = jwtPayload;
    const dataUpdate: UpdateReceiptReturn = {
      ...newReceiptReturnData,
      updatedAt: dayjs().toISOString(),
    };

    await database.transaction(async (tx) => {
      const { data: receipt } =
        await this.receiptRepository.findReceiptReturnById(id, {
          select: {
            status: receiptReturnTable.status,
            changeLog: receiptReturnTable.changeLog,
          },
        });

      if (!receipt) {
        throw new Error("Receipt not found");
      }

      if (newReceiptReturnData.status !== receipt.status) {
        // Update status change logs
        const changeLog = receipt.changeLog || [];
        changeLog.push({
          user: fullname,
          oldStatus: receipt.status,
          newStatus: newReceiptReturnData.status,
          timestamp: dayjs().toISOString(),
        });

        dataUpdate.changeLog = changeLog;
      }

      const { data } = await this.receiptRepository.updateReceiptReturn(
        {
          set: dataUpdate,
          where: [eq(receiptReturnTable.id, id)],
        },
        tx,
      );

      if (!data.length) {
        throw new Error("Can't update receipt Return");
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
        this.receiptItemRepository.createReceiptItem(receiptItemsData, tx);
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
      const { data } = await this.receiptRepository.deleteReceiptReturn(id, tx);
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
      await this.receiptRepository.findReceiptReturnById(receiptId, {
        select: {
          id: receiptReturnTable.id,
          receiptNumber: receiptReturnTable.receiptNumber,
          name: receiptReturnTable.name,
          note: receiptReturnTable.note,
          reason: receiptReturnTable.reason,
          quantity: receiptReturnTable.quantity,
          totalProduct: receiptReturnTable.totalProduct,
          totalAmount: receiptReturnTable.totalAmount,
          warehouse: receiptReturnTable.warehouse,
          supplier: {
            id: supplierTable.id,
            name: supplierTable.name,
          },
          returnDate: receiptReturnTable.returnDate,
          changeLog: receiptReturnTable.changeLog,
          status: receiptReturnTable.status,
          type: receiptReturnTable.type,
          createdAt: receiptReturnTable.createdAt,
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

  async getReceiptsByFilter(ctx: Context) {
    const query = ctx.req.query();

    const { keyword, status, returnDate } = query;
    const filters: any = [];

    if (keyword) {
      filters.push(
        or(
          ilike(receiptReturnTable.receiptNumber, `%${keyword}%`),
          ilike(receiptReturnTable.name, `%${keyword}%`),
        ),
      );
    }

    if (status) {
      filters.push(eq(receiptReturnTable.status, status));
    }

    if (returnDate) {
      const start = dayjs(returnDate).startOf("day").format();
      const end = dayjs(returnDate).endOf("day").format();
      filters.push(between(receiptReturnTable.returnDate, start, end));
    }

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

    const { data: receipts, count } =
      await this.receiptRepository.findReceiptsReturnByCondition({
        select: {
          id: receiptReturnTable.id,
          receiptNumber: receiptReturnTable.receiptNumber,
          name: receiptReturnTable.name,
          note: receiptReturnTable.note,
          reason: receiptReturnTable.reason,
          quantity: receiptReturnTable.quantity,
          totalProduct: receiptReturnTable.totalProduct,
          totalAmount: receiptReturnTable.totalAmount,
          warehouse: receiptReturnTable.warehouse,
          supplier: {
            id: supplierTable.id,
            name: supplierTable.name,
          },
          returnDate: receiptReturnTable.returnDate,
          status: receiptReturnTable.status,
          type: receiptReturnTable.type,
          createdAt: receiptReturnTable.createdAt,
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

  async getReceiptItemsByBarcode(ctx: Context) {
    const receiptNumber = ctx.req.param("receiptNumber");

    const { data: receipt } =
      await this.receiptRepository.findReceiptReturnByReceiptNumber(
        receiptNumber,
        {
          select: {
            id: receiptReturnTable.id,
            receiptNumber: receiptReturnTable.receiptNumber,
          },
        },
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
}
