import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { eq, isNull, sql } from "drizzle-orm";
import dayjs from "dayjs";

import { increment } from "../../../database/custom/helpers.ts";
import { ReceiptImportStatus } from "../../product/enums/receipt.enum.ts";

import { receiptItemTable } from "../../../database/schemas/receipt-item.schema.ts";
import { receiptImportTable } from "../../../database/schemas/receipt-import.schema.ts";
import { productTable } from "../../../database/schemas/product.schema.ts";

import { ProductRepository } from "../../../database/repositories/product.repository.ts";
import { ReceiptItemRepository } from "../../../database/repositories/receipt-item.repository.ts";
import { ReceiptImportRepository } from "../../../database/repositories/receipt-import.repository.ts";
import { ReceiptReturnRepository } from "../../../database/repositories/receipt-return.repository.ts";
import { ProductInventoryLogRepository } from "../../../database/repositories/product-inventory-log.repository.ts";

@singleton()
export default class InventoryHandler {
  constructor(
    @inject(ReceiptImportRepository)
    private readonly receiptImportRepository: ReceiptImportRepository,
    @inject(ReceiptReturnRepository)
    private readonly receiptReturnRepository: ReceiptReturnRepository,
    @inject(ReceiptItemRepository)
    private readonly receiptItemRepository: ReceiptItemRepository,
    @inject(ProductInventoryLogRepository)
    private readonly productInventoryLogRepository: ProductInventoryLogRepository,
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

  async getTotalInventory(ctx: Context) {
    const query = ctx.req.query();
    let { startDate, endDate } = query;

    // If dates are not provided, default to last 30 days
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    }

    const [totalInventory, dataset] = await Promise.all([
      this.productRepository.getTotalInventory(),
      this.productInventoryLogRepository.getInventoryByDateRange(
        startDate,
        endDate
      ),
    ]);

    return ctx.json({
      data: {
        value: totalInventory,
        dataset,
      },
      success: true,
      statusCode: 200,
    });
  }

  async getTotalValueInventory(ctx: Context) {
    const query = ctx.req.query();
    let { startDate, endDate } = query;

    // If dates are not provided, default to last 30 days
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    }

    const [totalValueInventory, dataset] = await Promise.all([
      this.productRepository.getTotalValueInventory(),
      this.productInventoryLogRepository.getValueInventoryByDateRange(
        startDate,
        endDate
      ),
    ]);

    return ctx.json({
      data: {
        value: totalValueInventory,
        dataset,
      },
      success: true,
      statusCode: 200,
    });
  }

  async getTotalOfImportNew(ctx: Context) {
    const query = ctx.req.query();
    let { startDate, endDate } = query;

    // If dates are not provided, default to last 30 days
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    }

    const [totalOfImportNew, dataset] = await Promise.all([
      this.receiptImportRepository.getTotalOfImportNew(),
      this.receiptImportRepository.getTotalImportsByDateRange(
        startDate,
        endDate
      ),
    ]);

    return ctx.json({
      data: {
        value: totalOfImportNew,
        dataset,
      },
      success: true,
      statusCode: 200,
    });
  }

  async getTotalOfReturn(ctx: Context) {
    const query = ctx.req.query();
    let { startDate, endDate } = query;

    // If dates are not provided, default to last 30 days
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    }

    const [totalOfReturn, dataset] = await Promise.all([
      this.receiptReturnRepository.getTotalOfReturn(),
      this.receiptReturnRepository.getTotalReturnsByDateRange(
        startDate,
        endDate
      ),
    ]);

    return ctx.json({
      data: {
        value: totalOfReturn,
        dataset,
      },
      success: true,
      statusCode: 200,
    });
  }

  async getImportProductsDataset(ctx: Context) {
    const query = ctx.req.query();
    let { productId, startDate, endDate } = query;

    // If dates are not provided, default to last 30 days
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    }

    const dataset =
      await this.receiptItemRepository.getImportProductsByDateRange(
        startDate,
        endDate,
        productId
      );

    return ctx.json({
      data: dataset,
      success: true,
      statusCode: 200,
    });
  }

  async getTotalProductInventoryByCategory(ctx: Context) {
    const query = ctx.req.query();
    const { category } = query;

    const totalInventory =
      await this.productRepository.getTotalProductInventoryByCategory(category);

    return ctx.json({
      data: totalInventory,
      success: true,
      statusCode: 200,
    });
  }

  async getProductInventoryByCategory(ctx: Context) {
    const query = ctx.req.query();
    const { category, page, limit } = query;

    const { data, total } = await this.productRepository.getInventoryByCategory(
      {
        category,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      }
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / (limit ? parseInt(limit) : 10));
    const currentPage = page ? parseInt(page) : 1;

    return ctx.json({
      data,
      metadata: {
        currentPage,
        totalPages,
        totalItems: total,
        itemsPerPage: limit ? parseInt(limit) : 10,
      },
      success: true,
      statusCode: 200,
    });
  }

  async getProductInventoryTurnOver(ctx: Context) {
    const query = ctx.req.query();
    let { startDate, endDate, page, limit } = query;

    // If dates are not provided, default to last 30 days
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    }

    const { data, total } =
      await this.productRepository.getInventoryTurnoverDataset({
        startDate,
        endDate,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / (limit ? parseInt(limit) : 10));
    const currentPage = page ? parseInt(page) : 1;

    return ctx.json({
      data,
      metadata: {
        currentPage,
        totalPages,
        totalItems: total,
        itemsPerPage: limit ? parseInt(limit) : 10,
      },
      success: true,
      statusCode: 200,
    });
  }
}
