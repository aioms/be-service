import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { eq, isNull, sql } from "drizzle-orm";
import dayjs from "dayjs";

import { receiptItemTable } from "../../../database/schemas/receipt-item.schema.ts";
import { ReceiptItemRepository } from "../../../database/repositories/receipt-item.repository.ts";
import { ReceiptImportRepository } from "../../../database/repositories/receipt-import.repository.ts";
import { receiptImportTable } from "../../../database/schemas/receipt-import.schema.ts";
import { ProductRepository } from "../../../database/repositories/product.repository.ts";
import { productTable } from "../../../database/schemas/product.schema.ts";
import { ReceiptImportStatus } from "../../product/enums/receipt.enum.ts";
import { increment } from "../../../database/custom/helpers.ts";

@singleton()
export default class InventoryHandler {
  constructor(
    @inject(ReceiptImportRepository)
    private readonly receiptImportRepository: ReceiptImportRepository,
    @inject(ReceiptItemRepository)
    private readonly receiptItemRepository: ReceiptItemRepository,
    @inject(ProductRepository)
    private readonly productRepository: ProductRepository
  ) {}

  async updateInventoryOfReceiptImport(ctx: Context) {
    const receiptNumber = ctx.req.param("receiptNumber");

    const { data: receiptImport } =
      await this.receiptImportRepository.findReceiptsImportByCondition({
        select: {
          id: receiptImportTable.id,
          receiptNumber: receiptImportTable.receiptNumber,
          status: receiptImportTable.status,
        },
        where: [
          eq(receiptImportTable.receiptNumber, receiptNumber),
          isNull(
            sql`${receiptImportTable.statusChangeLogs}->>'updateInventoryAt'`
          ),
        ],
      });

    if (!receiptImport.length) {
      return ctx.json({
        message: "Phiếu đã được cập nhật vào tồn kho",
        success: false,
        statusCode: 400,
      });
    }

    const { id: receiptId } = receiptImport[0];

    const { data: receiptItems } =
      await this.receiptItemRepository.findReceiptItemsByCondition({
        select: {
          id: receiptItemTable.id,
          productId: receiptItemTable.productId,
          quantity: receiptItemTable.quantity,
        },
        where: [eq(receiptItemTable.receiptId, receiptId)],
      });

    if (!receiptItems.length) {
      return ctx.json({
        message: "Không tìm thấy sản phẩm trong phiếu",
        success: false,
        statusCode: 400,
      });
    }

    // Update inventory of products
    await Promise.all(
      receiptItems.map((item) => {
        return this.productRepository.updateProduct({
          set: {
            inventory: increment(productTable.inventory, item.quantity),
            updatedAt: dayjs().toISOString(),
          },
          where: [eq(productTable.id, item.productId)],
        });
      })
    );

    // Update status logs for receipt import
    const { data: receiptUpdated } =
      await this.receiptImportRepository.updateReceiptImport({
        set: {
          status: ReceiptImportStatus.COMPLETED,
          statusChangeLogs: sql`COALESCE(${
            receiptImportTable.statusChangeLogs
          }, '{}')::jsonb || ${JSON.stringify({
            updateInventoryAt: dayjs().toISOString(),
          })}::jsonb`,
        },
        where: [eq(receiptImportTable.id, receiptId)],
      });

    if (!receiptUpdated.length) {
      throw new Error("Không thể cập nhật phiếu");
    }

    return ctx.json({
      message: "Cập nhật tồn kho thành công",
      success: true,
      statusCode: 200,
    });
  }
}
