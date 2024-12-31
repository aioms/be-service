import "reflect-metadata";

import { Hono } from "hono";
import { container } from "tsyringe";

import { authenticate } from "../../common/middlewares/verify-jwt.ts";
import InventoryHandler from "./handlers/inventory.ts";

export default class InventoryController {
  private readonly inventoryHandler = container.resolve(InventoryHandler);

  private readonly path = "/api/v1";

  init(app: Hono) {
    const route = new Hono();

    /**
     * INVENTORY
     */
    route.patch("/inventory/receipt-imports/:receiptNumber", authenticate, (c) =>
      this.inventoryHandler.updateInventoryOfReceiptImport(c),
    );

    app.route(this.path, route);
  }
}
