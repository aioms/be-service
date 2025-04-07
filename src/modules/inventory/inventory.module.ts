import { Hono } from "hono";
import { container, registry } from "tsyringe";

import InventoryController from "./inventory.controller.ts";

import { ProductRepository } from "../../database/repositories/product.repository.ts";
import { ReceiptImportRepository } from "../../database/repositories/receipt-import.repository.ts";
import { ReceiptItemRepository } from "../../database/repositories/receipt-item.repository.ts";
import { ReceiptReturnRepository } from "../../database/repositories/receipt-return.repository.ts";
import { ProductInventoryLogRepository } from "../../database/repositories/product-inventory-log.repository.ts";

@registry([
  {
    token: ProductRepository,
    useClass: ProductRepository,
  },
  {
    token: ReceiptImportRepository,
    useClass: ReceiptImportRepository,
  },
  {
    token: ReceiptReturnRepository,
    useClass: ReceiptReturnRepository,
  },
  {
    token: ReceiptItemRepository,
    useClass: ReceiptItemRepository,
  },
  {
    token: ProductInventoryLogRepository,
    useClass: ProductInventoryLogRepository,
  },
])
export default class InventoryModule {
  static init(app: Hono) {
    const controller = container.resolve(InventoryController);
    controller.init(app);
  }
}
