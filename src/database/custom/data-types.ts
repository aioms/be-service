import { customType } from "drizzle-orm/pg-core";

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
