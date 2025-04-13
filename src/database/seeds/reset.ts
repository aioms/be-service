// path to a file with schema you want to reset
import { drizzle } from "drizzle-orm/postgres-js";
import { reset } from "drizzle-seed";

import { supplierTable } from "../schemas/supplier.schema.ts";
import { userTable } from "../schemas/user.schema.ts";
import { productTable } from "../schemas/product.schema.ts";
import { productSupplierTable } from "../schemas/product-supplier.schema.ts";
import { productInventoryLogTable } from "../schemas/product-inventory-log.schema.ts";
import { receiptImportTable } from "../schemas/receipt-import.schema.ts";
import { receiptReturnTable } from "../schemas/receipt-return.schema.ts";
import { receiptCheckTable } from "../schemas/receipt-check.schema.ts";
import { receiptItemTable } from "../schemas/receipt-item.schema.ts";

async function main() {
  try {
    const db = drizzle(Deno.env.get("DATABASE_URL")!);
    console.log({ database_url: Deno.env.get("DATABASE_URL") });
    console.time("Reset database");
    await reset(db, {
      userTable,
      productTable,
      productSupplierTable,
      productInventoryLogTable,
      supplierTable,
      receiptImportTable,
      receiptReturnTable,
      receiptCheckTable,
      receiptItemTable,
    });
    console.timeEnd("Reset database");
    console.log("Database reset successfully");

    Deno.exit(0);
  } catch (error) {
    console.error("Error resetting database", error);
  }
}

main();
