import { Hono } from "hono";
import { container, registry } from "tsyringe";
import { ProductRepository } from "../../database/repositories/product.repository.ts";
import { ReceiptImportRepository } from "../../database/repositories/receipt-import.repository.ts";
import { ReceiptItemRepository } from "../../database/repositories/receipt-item.repository.ts";
import InventoryController from "./inventory.controller.ts";

// @registry([
//   {
//     token: ProductRepository,
//     useClass: ProductRepository,
//   },
//   {
//     token: ReceiptImportRepository,
//     useClass: ReceiptImportRepository,
//   },
//   {
//     token: ReceiptItemRepository,
//     useClass: ReceiptItemRepository,
//   },
// ])
export default class InventoryModule {
  static init(app: Hono) {
    const controller = container.resolve(InventoryController);
    controller.init(app);
  }
}
