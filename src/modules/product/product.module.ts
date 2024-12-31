import { Hono } from "hono";
import { container, registry } from "tsyringe";
import ProductController from "./product.controller.ts";
import { ProductRepository } from "../../database/repositories/product.repository.ts";
import { ReceiptImportRepository } from "../../database/repositories/receipt-import.repository.ts";
import { ReceiptItemRepository } from "../../database/repositories/receipt-item.repository.ts";
import { ReceiptReturnRepository } from "../../database/repositories/receipt-return.repository.ts";

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
])
export default class ProductModule {
  static init(app: Hono) {
    const controller = container.resolve(ProductController);
    controller.init(app);
  }
}
