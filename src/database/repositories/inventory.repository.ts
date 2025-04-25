import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import { productTable } from "../schemas/product.schema.ts";
import { desc, sql } from "drizzle-orm";
import { productInventoryLogTable } from "../schemas/product-inventory-log.schema.ts";
import {
  InventoryChangeType,
  TopStockSortBy,
} from "../enums/inventory.enum.ts";
import { SortOrder } from "../enums/common.enum.ts";

@singleton()
export class InventoryRepository {
  async getInventoryTurnoverDataset(opts: {
    startDate: string;
    endDate: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: { x: string; y: number }[];
    total: number;
  }> {
    const page = opts.page || 1;
    const limit = opts.limit || 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await database.$count(productTable);

    // Calculate inventory turnover for each product
    const query = database
      .select({
        productName: productTable.productName,
        // Get beginning inventory (inventory at start date)
        beginningInventory: sql<number>`
          COALESCE(
            (
              SELECT current_inventory
              FROM ${productInventoryLogTable}
              WHERE product_id = ${productTable.id}
              AND created_at < ${opts.startDate}::timestamp
              ORDER BY created_at DESC
              LIMIT 1
            ),
            ${productTable.inventory}
          )
        `,
        // Get ending inventory (inventory at end date)
        endingInventory: sql<number>`
          COALESCE(
            (
              SELECT current_inventory
              FROM ${productInventoryLogTable}
              WHERE product_id = ${productTable.id}
              AND created_at <= ${opts.endDate}::timestamp
              ORDER BY created_at DESC
              LIMIT 1
            ),
            ${productTable.inventory}
          )
        `,
        // Get total goods sold/used in period (sum of negative inventory changes)
        totalSold: sql<number>`
          COALESCE(
            (
              SELECT SUM(ABS(inventory_change))
              FROM ${productInventoryLogTable}
              WHERE product_id = ${productTable.id}
              AND created_at BETWEEN ${opts.startDate}::timestamp AND ${opts.endDate}::timestamp
              AND change_type IN (${InventoryChangeType.IMPORT})
            ),
            0
          )
        `,
      })
      .from(productTable)
      .orderBy(productTable.productName)
      .limit(limit)
      .offset(offset);

    const results = await query.execute();

    // Transform data into chart format with inventory turnover calculation
    const dataset = results.map((item) => {
      // Calculate average inventory
      const averageInventory =
        (Number(item.beginningInventory) + Number(item.endingInventory)) / 2;

      // Calculate inventory turnover ratio
      // If average inventory is 0, return 0 to avoid division by zero
      const turnoverRatio =
        averageInventory > 0 ? Number(item.totalSold) / averageInventory : 0;

      return {
        x: item.productName,
        y: Number(turnoverRatio.toFixed(2)), // Round to 2 decimal places
      };
    });

    return {
      data: dataset,
      total: totalCount,
    };
  }

  async getTopStockItems(opts?: {
    sortBy?: TopStockSortBy;
    sortOrder?: SortOrder;
  }): Promise<{
    data: {
      productName: string;
      inventory: number;
      inventoryValue: number;
    }[];
  }> {
    const { sortBy = TopStockSortBy.INVENTORY, sortOrder = SortOrder.DESC } =
      opts || {};

    // Build the ORDER BY clause based on sort parameters
    const orderByClause = (() => {
      switch (sortBy) {
        case TopStockSortBy.VALUE:
          return [
            sortOrder === SortOrder.DESC
              ? desc(sql`${productTable.inventory} * ${productTable.costPrice}`)
              : sql`${productTable.inventory} * ${productTable.costPrice}`,
            desc(productTable.inventory), // Secondary sort always by inventory DESC
          ];
        case TopStockSortBy.INVENTORY:
        default:
          return [
            sortOrder === SortOrder.DESC
              ? desc(productTable.inventory)
              : productTable.inventory,
            desc(sql`${productTable.inventory} * ${productTable.costPrice}`), // Secondary sort always by value DESC
          ];
      }
    })();

    const query = database
      .select({
        id: productTable.id,
        productName: productTable.productName,
        inventory: productTable.inventory,
        inventoryValue: sql<number>`
          CAST(${productTable.inventory} * ${productTable.costPrice} AS DECIMAL(10,2))
        `,
      })
      .from(productTable)
      .where(sql`${productTable.inventory} > 0`)
      .orderBy(...orderByClause)
      .limit(10);

    const results = await query.execute();

    return {
      data: results.map((item) => ({
        id: item.id,
        productName: item.productName,
        inventory: Number(item.inventory),
        inventoryValue: Number(item.inventoryValue),
      })),
    };
  }

  async getDeadStockInventory(opts: {
    startDate: string;
    endDate: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: {
      id: string;
      productName: string;
      currentInventory: number;
      currentValueInventory: number;
      deadStockRatio: number;
      lastMovementDate: string | null;
    }[];
    total: number;
  }> {
    const page = opts.page || 1;
    const limit = opts.limit || 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await database.$count(productTable);

    const query = database
      .select({
        id: productTable.id,
        productName: productTable.productName,
        currentInventory: productTable.inventory,
        currentValueInventory: sql<number>`
          CAST(${productTable.inventory} * ${productTable.costPrice} AS DECIMAL(10,2))
        `,
        initialInventory: sql<number>`
          COALESCE(
            (
              SELECT current_inventory
              FROM ${productInventoryLogTable}
              WHERE product_id = ${productTable.id}
              AND created_at >= ${opts.startDate}::timestamp
              AND created_at < ${opts.startDate}::timestamp + INTERVAL '1 day'
              ORDER BY created_at ASC
              LIMIT 1
            ),
            ${productTable.inventory}
          )
        `,
        lastMovementDate: sql<string>`
          (
            SELECT DATE(created_at)
            FROM ${productInventoryLogTable}
            WHERE product_id = ${productTable.id}
            AND inventory_change != 0
            ORDER BY created_at DESC
            LIMIT 1
          )
        `,
      })
      .from(productTable)
      .where(sql`${productTable.inventory} > 0`)
      .orderBy(desc(productTable.inventory))
      .limit(limit)
      .offset(offset);

    const results = await query.execute();

    // Calculate dead stock ratio and format results
    const dataset = results.map((item) => ({
      id: item.id,
      productName: item.productName,
      currentInventory: Number(item.currentInventory),
      currentValueInventory: Number(item.currentValueInventory),
      deadStockRatio:
        Number(item.initialInventory) > 0
          ? Number(
              (
                (Number(item.currentInventory) /
                  Number(item.initialInventory)) *
                100
              ).toFixed(2)
            )
          : 0,
      lastMovementDate: item.lastMovementDate,
    }));

    return {
      data: dataset,
      total: totalCount,
    };
  }

  async getOutOfStockDates(opts: {
    startDate: string;
    endDate: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: {
      productName: string;
      averageDaysInventory: number;
      outOfStockDate: string | null;
    }[];
    total: number;
  }> {
    const page = opts.page || 1;
    const limit = opts.limit || 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await database.$count(productTable);

    const query = database
      .select({
        productName: productTable.productName,
        // Get beginning inventory
        beginningInventory: sql<number>`
          COALESCE(
            (
              SELECT current_inventory
              FROM ${productInventoryLogTable}
              WHERE product_id = ${productTable.id}
              AND created_at < ${opts.startDate}::timestamp
              ORDER BY created_at DESC
              LIMIT 1
            ),
            ${productTable.inventory}
          )
        `,
        // Get ending inventory
        endingInventory: sql<number>`
          COALESCE(
            (
              SELECT current_inventory
              FROM ${productInventoryLogTable}
              WHERE product_id = ${productTable.id}
              AND created_at <= ${opts.endDate}::timestamp
              ORDER BY created_at DESC
              LIMIT 1
            ),
            ${productTable.inventory}
          )
        `,
        // Get total supply (imports + returns)
        totalSupply: sql<number>`
          COALESCE(
            (
              SELECT SUM(ABS(inventory_change))
              FROM ${productInventoryLogTable}
              WHERE product_id = ${productTable.id}
              AND created_at BETWEEN ${opts.startDate}::timestamp AND ${opts.endDate}::timestamp
              AND change_type IN (${InventoryChangeType.IMPORT})
            ),
            0
          )
        `,
        // Get last restock date
        lastRestockDate: sql<string>`
          COALESCE(
            (
              SELECT DATE(created_at)
              FROM ${productInventoryLogTable}
              WHERE product_id = ${productTable.id}
              AND change_type IN (${InventoryChangeType.IMPORT})
              ORDER BY created_at DESC
              LIMIT 1
            ),
            NULL
          )
        `,
      })
      .from(productTable)
      .orderBy(productTable.productName)
      .limit(limit)
      .offset(offset);

    const results = await query.execute();

    // Transform data and calculate out-of-stock dates
    const dataset = results.map((item) => {
      const beginningInventory = Number(item.beginningInventory);
      const endingInventory = Number(item.endingInventory);
      const totalSupply = Number(item.totalSupply);
      console.log({ beginningInventory, endingInventory, totalSupply });

      // Calculate average inventory
      const averageInventory = (beginningInventory + endingInventory) / 2;
      console.log({ averageInventory });

      // Calculate inventory turnover
      // If average inventory is 0, set turnover to 0 to avoid division by zero
      const inventoryTurnover =
        averageInventory > 0 ? totalSupply / averageInventory : 0;
      console.log({ inventoryTurnover });

      // Calculate average days of inventory
      // If inventory turnover is 0, set to null to indicate infinite/unknown days
      const averageDaysInventory =
        inventoryTurnover > 0 ? Math.round(365 / inventoryTurnover) : null;
      console.log({ averageDaysInventory });

      // Calculate out of stock date
      let outOfStockDate: string | null = null;
      if (averageDaysInventory && item.lastRestockDate) {
        const lastRestock = new Date(item.lastRestockDate);
        lastRestock.setDate(lastRestock.getDate() + averageDaysInventory);
        outOfStockDate = lastRestock.toISOString().split("T")[0];
        console.log({ outOfStockDate });
      }

      return {
        productName: item.productName,
        averageDaysInventory: averageDaysInventory ?? 0,
        outOfStockDate: outOfStockDate,
      };
    });

    return {
      data: dataset,
      total: totalCount,
    };
  }
}
