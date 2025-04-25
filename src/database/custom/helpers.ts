import { sql, AnyColumn } from "drizzle-orm";

export const increment = (column: AnyColumn, value = 1) => {
  return sql`${column} + ${value}`;
};
