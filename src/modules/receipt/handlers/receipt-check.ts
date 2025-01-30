import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { sql, between, desc, eq, ilike, or, sum } from "drizzle-orm";
import dayjs from "dayjs";

// REPOSITORY
import { ReceiptCheckRepository } from "../../../database/repositories/receipt-check.repository.ts";
import { ReceiptItemRepository } from "../../../database/repositories/receipt-item.repository.ts";

// SCHEMA
import {
  InsertReceiptCheck,
  receiptCheckTable,
  UpdateReceiptCheck,
} from "../../../database/schemas/receipt-check.schema.ts";
import { receiptItemTable } from "../../../database/schemas/receipt-item.schema.ts";

// DTO
import {
  CreateReceiptCheckRequestDto,
  UpdateReceiptCheckRequestDto,
} from "../dtos/receipt-check.dto.ts";

import {
  getPagination,
  getPaginationMetadata,
  parseBodyJson,
} from "../../../common/utils/index.ts";
import { ReceiptCheckStatus } from "../enums/receipt.enum.ts";
import { userTable } from "../../../database/schemas/user.schema.ts";

@singleton()
export default class ReceiptCheckHandler {
  constructor(
    @inject(ReceiptCheckRepository)
    private receiptRepository: ReceiptCheckRepository,
    @inject(ReceiptItemRepository)
    private receiptItemRepository: ReceiptItemRepository,
  ) {}

  async createReceipt(ctx: Context) {
    const jwtPayload = ctx.get("jwtPayload");
    const userId = jwtPayload.sub;

    const body = await parseBodyJson<CreateReceiptCheckRequestDto>(ctx);
    const { periodic, checker, supplier, date, note, items } = body;

    const receiptNumber = `KIEM${dayjs().format("YYMMDDHHmm")}`;
    const receiptImportData: InsertReceiptCheck = {
      receiptNumber,
      periodic,
      supplier,
      date,
      note,
      status: ReceiptCheckStatus.PENDING,
      checker,
      userCreated: userId,
    };
    const { data } =
      await this.receiptRepository.createReceiptCheck(receiptImportData);

    if (!data.length) {
      throw new Error("Can't create receipt");
    }

    const receiptId = data[0].id;

    // Create receipt items
    const receiptItemsData = items.map((item) => ({
      ...item,
      receiptId,
    }));
    await this.receiptItemRepository.createReceiptItem(receiptItemsData);

    return ctx.json({
      data: { id: receiptId },
      success: true,
      statusCode: 201,
    });
  }

  async updateReceipt(ctx: Context) {
    const id = ctx.req.param("id");
    const body = await parseBodyJson<UpdateReceiptCheckRequestDto>(ctx);
    const { items, ...payload } = body;

    const dataUpdate: UpdateReceiptCheck = {
      ...payload,
      updatedAt: dayjs().toISOString(),
    };

    const { data } = await this.receiptRepository.updateReceiptCheck({
      set: dataUpdate,
      where: [eq(receiptCheckTable.id, id)],
    });

    if (!data.length) {
      throw new Error("Can't update receipt check");
    }

    // Delete old receipt items
    await this.receiptItemRepository.deleteReceiptItemByReceiptId(id);

    // Create receipt items
    const receiptItemsData = items.map((item) => ({
      ...item,
      receiptId: id,
    }));

    // return ids[]
    this.receiptItemRepository.createReceiptItem(receiptItemsData);

    return ctx.json({
      data: { id },
      success: true,
      statusCode: 200,
    });
  }

  async deleteReceipt(ctx: Context) {
    const id = ctx.req.param("id");

    const { data } = await this.receiptRepository.deleteReceiptCheck(id);
    if (!data.length) {
      throw new Error("Receipt not found");
    }

    // Delete receipt items
    await this.receiptItemRepository.deleteReceiptItemByReceiptId(id);

    return ctx.json({
      data,
      success: true,
      statusCode: 204,
    });
  }

  async getReceiptById(ctx: Context) {
    const receiptId = ctx.req.param("id");

    const { data: receipt } = await this.receiptRepository.findReceiptCheckById(
      receiptId,
      {
        select: {
          id: receiptCheckTable.id,
          receiptNumber: receiptCheckTable.receiptNumber,
          note: receiptCheckTable.note,
          supplier: receiptCheckTable.supplier,
          periodic: receiptCheckTable.periodic,
          date: receiptCheckTable.date,
          status: receiptCheckTable.status,
          checker: receiptCheckTable.checker,
          createdAt: receiptCheckTable.createdAt,
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
      await this.receiptRepository.findReceiptCheckByReceiptNumber(
        receiptNumber,
        {
          select: {
            id: receiptCheckTable.id,
            receiptNumber: receiptCheckTable.receiptNumber,
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

  async getReceiptsByFilter(ctx: Context) {
    const query = ctx.req.query();

    const { keyword, status, date } = query;
    const filters: any = [];

    if (keyword) {
      filters.push(
        or(
          ilike(receiptCheckTable.receiptNumber, `%${keyword}%`),
          ilike(receiptCheckTable.supplier, `%${keyword}%`),
        ),
      );
    }

    if (status) {
      filters.push(eq(receiptCheckTable.status, status));
    }

    if (date) {
      const start = dayjs(date).startOf("day").format();
      const end = dayjs(date).endOf("day").format();
      filters.push(between(receiptCheckTable.date, start, end));
    }

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

    const { data: receipts, count } =
      await this.receiptRepository.findReceiptsCheckByCondition({
        select: {
          id: receiptCheckTable.id,
          receiptNumber: receiptCheckTable.receiptNumber,
          note: receiptCheckTable.note,
          supplier: receiptCheckTable.supplier,
          periodic: receiptCheckTable.periodic,
          checker: {
            fullname: userTable.fullname,
          },
          systemInventory: sum(receiptItemTable.inventory).mapWith(Number),
          actualInventory: sum(receiptItemTable.actualInventory).mapWith(
            Number,
          ),
          totalDifference:
            sql<number>`SUM(${receiptItemTable.actualInventory} - ${receiptItemTable.inventory})`.mapWith(
              Number,
            ),
          totalValueDifference:
            sql<number>`SUM((${receiptItemTable.actualInventory} - ${receiptItemTable.inventory}) * ${receiptItemTable.costPrice})`.mapWith(
              Number,
            ),
          date: receiptCheckTable.date,
          status: receiptCheckTable.status,
          createdAt: receiptCheckTable.createdAt,
        },
        where: filters,
        orderBy: [desc(receiptCheckTable.createdAt)],
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
}
