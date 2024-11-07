import { Hono } from "hono";
import { container, registry } from "tsyringe";
import ProductController from "./product.controller.ts";
import { ProductRepository } from "../../database/repositories/product.repository.ts";

@registry([
  {
    token: ProductRepository,
    useClass: ProductRepository,
  },
])
export default class ProductModule {
  static init(app: Hono) {
    const controller = container.resolve(ProductController);
    controller.init(app);
  }
}
