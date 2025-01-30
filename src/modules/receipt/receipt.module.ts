import { Hono } from "hono";
import { container, registry } from "tsyringe";
import { ProductRepository } from "../../database/repositories/product.repository.ts";
import { ReceiptItemRepository } from "../../database/repositories/receipt-item.repository.ts";
import ReceiptController from "./receipt.controller.ts";

@registry([
  {
    token: ProductRepository,
    useClass: ProductRepository,
  },
  {
    token: ReceiptItemRepository,
    useClass: ReceiptItemRepository,
  },
])
export default class ReceiptModule {
  static init(app: Hono) {
    const controller = container.resolve(ReceiptController);
    controller.init(app);
  }
}
