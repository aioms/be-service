import { customType } from "drizzle-orm/pg-core";
import { database } from "../../common/config/database.ts";

export type PgTx = Parameters<Parameters<typeof database["transaction"]>[0]>[0];

export const customNumeric = customType<{
  data: number;
  notNull: true;
  default: true;
}>({
  dataType() {
    return "numeric";
  },
  fromDriver(value: any) {
    return +value;
  },
});
