import "reflect-metadata";

import { Hono } from "hono";
import { container } from "tsyringe";

import ProductHandler from "./handlers/product.ts";
import { authenticate } from "../../common/middlewares/verify-jwt.ts";

export default class ProductController {
  private readonly productHandler = container.resolve(ProductHandler);
  private readonly path = "/api/v1";

  init(app: Hono) {
    const route = new Hono();

    route.get("/products/categories", authenticate, (c) =>
      this.productHandler.getCategories(c),
    );

    route.get("/products/suppliers", authenticate, (c) =>
      this.productHandler.getSuppliers(c),
    );

    route.get("/products/units", authenticate, (c) =>
      this.productHandler.getUnits(c),
    );

    route.post("/products", authenticate, (c) =>
      this.productHandler.createProduct(c),
    );

    route.put("/products/:id", authenticate, (c) =>
      this.productHandler.updateProduct(c),
    );

    route.delete("/products/:id", authenticate, (c) =>
      this.productHandler.deleteProduct(c),
    );

    route.get("/products/:id", authenticate, (c) =>
      this.productHandler.getProductById(c),
    );

    route.get("/products", authenticate, (c) =>
      this.productHandler.getProductsByFilter(c),
    );

    route.post("/products/import", authenticate, (c) =>
      this.productHandler.importProducts(c),
    );

    app.route(this.path, route);
  }
}
