import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { eq, isNull, sql } from "drizzle-orm";
import dayjs from "dayjs";

import { increment } from "../../../database/custom/helpers.ts";
import { SortOrder } from "../../../database/enums/common.enum.ts";
import {
  InventoryChangeType,
  TopStockSortBy,
} from "../../../database/enums/inventory.enum.ts";
import { ReceiptImportStatus } from "../../receipt/enums/receipt.enum.ts";

import { receiptItemTable } from "../../../database/schemas/receipt-item.schema.ts";
import { receiptImportTable } from "../../../database/schemas/receipt-import.schema.ts";
import { productTable } from "../../../database/schemas/product.schema.ts";

import { ProductRepository } from "../../../database/repositories/product.repository.ts";
import { ReceiptItemRepository } from "../../../database/repositories/receipt-item.repository.ts";
import { ReceiptImportRepository } from "../../../database/repositories/receipt-import.repository.ts";
import { ReceiptReturnRepository } from "../../../database/repositories/receipt-return.repository.ts";
import { ProductInventoryLogRepository } from "../../../database/repositories/product-inventory-log.repository.ts";
import { InventoryRepository } from "../../../database/repositories/inventory.repository.ts";
import { database } from "../../../common/config/database.ts";

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
    private readonly productRepository: ProductRepository,
    @inject(InventoryRepository)
    private readonly inventoryRepository: InventoryRepository
  ) {}

  async updateInventoryOfReceiptImport(ctx: Context) {
    const jwtPayload = ctx.get("jwtPayload");
    const userId = jwtPayload.sub;
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
          inventory: receiptItemTable.inventory,
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

    await database.transaction(async (tx) => {
      // Update inventory of products
      await Promise.all(
        receiptItems.map(async (item) => {
          await this.productInventoryLogRepository.createLog(
            {
              productId: item.productId,
              changeType: InventoryChangeType.IMPORT,
              previousInventory: item.inventory,
              inventoryChange: item.quantity,
              currentInventory: item.inventory + item.quantity,
              userId,
            },
            tx
          );

          await this.productRepository.updateProduct(
            {
              set: {
                inventory: increment(productTable.inventory, item.quantity),
                updatedAt: dayjs().toISOString(),
              },
              where: [eq(productTable.id, item.productId)],
            },
            tx
          );
        })
      );

      // Update status logs for receipt import
      const { data: receiptUpdated } =
        await this.receiptImportRepository.updateReceiptImport(
          {
            set: {
              status: ReceiptImportStatus.COMPLETED,
              statusChangeLogs: sql`COALESCE(${
                receiptImportTable.statusChangeLogs
              }, '{}')::jsonb || ${JSON.stringify({
                updateInventoryAt: dayjs().toISOString(),
              })}::jsonb`,
            },
            where: [eq(receiptImportTable.id, receiptId)],
          },
          tx
        );

      if (!receiptUpdated.length) {
        throw new Error("Không thể cập nhật phiếu");
      }
    });

    return ctx.json({
      message: "Cập nhật tồn kho thành công",
      success: true,
      statusCode: 200,
    });
  }

  async getTotalInventoryDataset(ctx: Context) {
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

  async getTotalValueInventoryDataset(ctx: Context) {
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

  async getTotalOfImportNewDataset(ctx: Context) {
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
        dataset: [],
      },
      success: true,
      statusCode: 200,
    });
  }

  async getTotalOfReturnDataset(ctx: Context) {
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
      await this.inventoryRepository.getInventoryTurnoverDataset({
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

  async getTopStockItems(ctx: Context) {
    const query = ctx.req.query();
    const { sortBy, sortOrder } = query;

    // Validate sort parameters
    const validSortBy = Object.values(TopStockSortBy).includes(
      sortBy as TopStockSortBy
    )
      ? (sortBy as TopStockSortBy)
      : TopStockSortBy.INVENTORY;

    const validSortOrder = Object.values(SortOrder).includes(
      sortOrder as SortOrder
    )
      ? (sortOrder as SortOrder)
      : SortOrder.DESC;

    const { data } = await this.inventoryRepository.getTopStockItems({
      sortBy: validSortBy,
      sortOrder: validSortOrder,
    });

    return ctx.json({
      data,
      metadata: {
        sortBy: validSortBy,
        sortOrder: validSortOrder,
      },
      success: true,
      statusCode: 200,
    });
  }

  async getDeadStockInventory(ctx: Context) {
    const query = ctx.req.query();
    const { month, page, limit } = query;

    // Validate month parameter (1-12)
    const monthNumber = month ? parseInt(month) : new Date().getMonth() + 1;
    if (monthNumber < 1 || monthNumber > 12) {
      return ctx.json(
        {
          success: false,
          message: "Invalid month. Month must be between 1 and 12",
          statusCode: 400,
        },
        400
      );
    }

    // Calculate date range from specified month to current date
    const now = new Date();
    const currentYear = now.getFullYear();

    // If specified month is greater than current month, use previous year
    const year =
      monthNumber > now.getMonth() + 1 ? currentYear - 1 : currentYear;

    // Set start date to beginning of specified month
    const startDate = new Date(year, monthNumber - 1, 1)
      .toISOString()
      .split("T")[0];

    // Set end date to current date
    const endDate = now.toISOString().split("T")[0];

    const { data, total } =
      await this.inventoryRepository.getDeadStockInventory({
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
        dateRange: {
          from: startDate,
          to: endDate,
        },
      },
      success: true,
      statusCode: 200,
    });
  }

  async getOutOfStockDates(ctx: Context) {
    const query = ctx.req.query();
    const { timeline, page, limit } = query;
    let startDate, endDate;

    switch (timeline) {
      case "today":
        startDate = dayjs().startOf("day").toISOString().split("T")[0];
        endDate = dayjs().endOf("day").toISOString().split("T")[0];
        break;
      case "next7days":
        startDate = dayjs().startOf("day").toISOString().split("T")[0];
        endDate = dayjs()
          .add(7, "day")
          .endOf("day")
          .toISOString()
          .split("T")[0];
        break;
      case "next30days":
        startDate = dayjs().startOf("day").toISOString().split("T")[0];
        endDate = dayjs()
          .add(30, "day")
          .endOf("day")
          .toISOString()
          .split("T")[0];
        break;
      default:
        startDate = dayjs().startOf("day").toISOString().split("T")[0];
        endDate = dayjs().endOf("day").toISOString().split("T")[0];
        break;
    }

    const { data, total } = await this.inventoryRepository.getOutOfStockDates({
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
        limit: limit ? parseInt(limit) : 10,
        dateRange: {
          from: startDate,
          to: endDate,
        },
      },
      success: true,
      statusCode: 200,
    });
  }
}
