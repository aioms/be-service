import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";

import { parseBodyJson } from "../../../common/utils/index.ts";
import {
  InsertReceiptItem,
  UpdateReceiptItem,
  receiptItemTable,
} from "../../../database/schemas/receipt-item.schema.ts";
import { ReceiptItemRepository } from "../../../database/repositories/receipt-item.repository.ts";

@singleton()
export default class ReceiptItemHandler {
  constructor(
    @inject(ReceiptItemRepository)
    private receiptItemRepository: ReceiptItemRepository
  ) {}

  async createReceiptItem(ctx: Context) {
    const body = await parseBodyJson<InsertReceiptItem>(ctx);

    const { data } = await this.receiptItemRepository.createReceiptItem([body]);

    if (!data.length) {
      throw new Error("Can't create receipt item");
    }

    return ctx.json({
      data: { id: data[0].id },
      success: true,
      statusCode: 201,
    });
  }

  async updateReceiptItem(ctx: Context) {
    const id = ctx.req.param("id");
    const body = await parseBodyJson<UpdateReceiptItem>(ctx);

    const dataUpdate: UpdateReceiptItem = {
      ...body,
      updatedAt: dayjs().toISOString(),
    };

    const { data } = await this.receiptItemRepository.updateReceiptItem({
      set: dataUpdate,
      where: [eq(receiptItemTable.id, id)],
    });

    if (!data.length) {
      throw new Error("Can't update receipt item");
    }

    return ctx.json({
      data: { id },
      success: true,
      statusCode: 201,
    });
  }

  async deleteReceiptItem(ctx: Context) {
    const id = ctx.req.param("id");

    const { data } = await this.receiptItemRepository.deleteReceiptItem(id);
    if (!data.length) {
      throw new Error("Receipt item not found");
    }

    return ctx.json({
      data,
      success: true,
      statusCode: 204,
    });
  }
}
