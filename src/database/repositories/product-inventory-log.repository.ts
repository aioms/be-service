import { and, sql } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  InsertProductInventoryLog,
  productInventoryLogTable,
} from "../schemas/product-inventory-log.schema.ts";
import { PgTx } from "../custom/data-types.ts";
import { productTable } from "../schemas/product.schema.ts";

@singleton()
export class ProductInventoryLogRepository {
  async createLog(data: InsertProductInventoryLog, tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .insert(productInventoryLogTable)
      .values(data)
      .returning();
    return { data: result[0], error: null };
  }

  async getInventoryChangeSummary(startDate: string, endDate: string) {
    const results = await database
      .select({
        changeType: productInventoryLogTable.changeType,
        totalChange: sql<number>`SUM(${productInventoryLogTable.inventoryChange})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(productInventoryLogTable)
      .where(
        and(
          sql`${productInventoryLogTable.createdAt}::date >= ${startDate}::date`,
          sql`${productInventoryLogTable.createdAt}::date <= ${endDate}::date`
        )
      )
      .groupBy(productInventoryLogTable.changeType);

    return { data: results, error: null };
  }

  async getInventoryByDateRange(
    startDate: string,
    endDate: string
  ): Promise<{ x: string; y: number }[]> {
    // Ensure dates are in correct format
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get daily ending inventory from inventory logs
    const results = await database
      .select({
        date: sql<string>`DATE(${productInventoryLogTable.createdAt})`,
        lastInventory: sql<number>`
          COALESCE(
            (
              SELECT current_inventory
              FROM ${productInventoryLogTable} t2
              WHERE DATE(t2.created_at) = DATE(${productInventoryLogTable.createdAt})
              ORDER BY t2.created_at DESC
              LIMIT 1
            ),
            0
          )
        `,
      })
      .from(productInventoryLogTable)
      .where(
        and(
          sql`${
            productInventoryLogTable.createdAt
          }::date >= ${start.toISOString()}::date`,
          sql`${
            productInventoryLogTable.createdAt
          }::date <= ${end.toISOString()}::date`
        )
      )
      .groupBy(sql`DATE(${productInventoryLogTable.createdAt})`)
      .orderBy(sql`DATE(${productInventoryLogTable.createdAt})`);

    // Get the inventory value right before the start date
    const initialInventory = await database
      .select({
        inventory: sql<number>`
          COALESCE(
            (
              SELECT current_inventory
              FROM ${productInventoryLogTable}
              WHERE created_at < ${start.toISOString()}::date
              ORDER BY created_at DESC
              LIMIT 1
            ),
            (SELECT COALESCE(SUM(inventory), 0) FROM ${productTable})
          )
        `,
      })
      .from(productInventoryLogTable)
      .limit(1)
      .execute();

    // Generate complete date range with inventory values
    const dataset: { x: string; y: number }[] = [];
    const currentDate = new Date(start);
    let lastKnownInventory = Number(initialInventory[0]?.inventory || 0);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayData = results.find((r) => r.date === dateStr);

      // If we have data for this day, update the last known inventory
      if (dayData) {
        lastKnownInventory = Number(dayData.lastInventory);
      }

      dataset.push({
        x: dateStr,
        y: lastKnownInventory,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dataset;
  }

  async getValueInventoryByDateRange(
    startDate: string,
    endDate: string
  ): Promise<{ x: string; y: number }[]> {
    // Ensure dates are in correct format
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get daily total value changes from inventory logs
    const results = await database
      .select({
        date: sql<string>`DATE(${productInventoryLogTable.createdAt})`,
        totalValue: sql<number>`
          SUM(
            CASE
              WHEN ${productInventoryLogTable.changeType} IN ('IMPORT', 'RETURN')
              THEN ${productInventoryLogTable.inventoryChange} * ${productInventoryLogTable.currentCostPrice}
              ELSE 0
            END
          )`,
        count: sql<number>`COUNT(*)`,
      })
      .from(productInventoryLogTable)
      .where(
        and(
          sql`${
            productInventoryLogTable.createdAt
          }::date >= ${start.toISOString()}::date`,
          sql`${
            productInventoryLogTable.createdAt
          }::date <= ${end.toISOString()}::date`
        )
      )
      .groupBy(sql`DATE(${productInventoryLogTable.createdAt})`)
      .orderBy(sql`DATE(${productInventoryLogTable.createdAt})`);

    // Generate complete date range with value changes
    const dataset: { x: string; y: number }[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayData = results.find((r) => r.date === dateStr);

      dataset.push({
        x: dateStr,
        y: dayData ? Number(dayData.totalValue) : 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dataset;
  }
}
