import "reflect-metadata";

import { Hono } from "hono";
import { container } from "tsyringe";

import { authenticate } from "../../common/middlewares/verify-jwt.ts";
import SupplierHandler from "./handlers/supplier.ts";

export default class SupplierController {
  private readonly supplierHandler = container.resolve(SupplierHandler);

  private readonly path = "/api/v1";

  init(app: Hono) {
    const route = new Hono();

    route.post("/suppliers", authenticate, (c) =>
      this.supplierHandler.createSupplier(c),
    );

    route.put("/suppliers/:id", authenticate, (c) =>
      this.supplierHandler.updateSupplier(c),
    );

    route.delete("/suppliers/:id", authenticate, (c) =>
      this.supplierHandler.deleteSupplier(c),
    );

    route.get("/suppliers/:id", authenticate, (c) =>
      this.supplierHandler.getSupplierById(c),
    );

    route.get("/suppliers/:id/products", authenticate, (c) =>
      this.supplierHandler.getProductsBySupplier(c),
    );

    route.get("/suppliers/:id/receipt-imports", authenticate, (c) =>
      this.supplierHandler.getReceiptsImportBySupplier(c),
    );

    route.get("/suppliers/:id/receipt-returns", authenticate, (c) =>
      this.supplierHandler.getReceiptsReturnBySupplier(c),
    );

    route.get("/suppliers", authenticate, (c) =>
      this.supplierHandler.getSuppliersByFilter(c),
    );

    route.post("/suppliers/import", authenticate, (c) =>
      this.supplierHandler.importSuppliers(c),
    );

    app.route(this.path, route);
  }
}
