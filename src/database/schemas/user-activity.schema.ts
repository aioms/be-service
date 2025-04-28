import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";
import { userTable } from "./user.schema.ts";

// export const activityType = pgEnum(
//   "activity_type",
//   [
//     "RECEIPT_COMPLETED",    // Đơn hàng hoàn thành
//     "RECEIPT_IMPORTED",     // Nhập kho phiếu
//     "PRODUCT_UPDATED",      // Cập nhật sản phẩm
//     "PRODUCT_CREATED",
//     "PRODUCT_DELETED",
//     "SUPPLIER_CREATED",
//     "SUPPLIER_UPDATED",
//     "SUPPLIER_DELETED",
//     "USER_CREATED",
//     "USER_UPDATED",
//     "USER_DELETED",
//   ] as [string, ...string[]]
// );

export const userActivityTable = pgTable(DbTables.UserActivities, {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userTable.id),
  type: text("type").notNull(),
  description: text("description").notNull(),
  referenceId: uuid("reference_id"), // ID of related entity (product, receipt, etc)
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

// Types for TypeScript
export type InsertUserActivity = typeof userActivityTable.$inferInsert;
export type SelectUserActivity = typeof userActivityTable.$inferSelect;

// Indexes for better query performance
// export const userActivityIndexes = {
//   userIdIdx: sql`CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON ${userActivityTable} (user_id)`,
//   createdAtIdx: sql`CREATE INDEX IF NOT EXISTS user_activity_created_at_idx ON ${userActivityTable} (created_at)`,
//   typeIdx: sql`CREATE INDEX IF NOT EXISTS user_activity_type_idx ON ${userActivityTable} (type)`,
//   referenceIdIdx: sql`CREATE INDEX IF NOT EXISTS user_activity_reference_id_idx ON ${userActivityTable} (reference_id)`,
// };
