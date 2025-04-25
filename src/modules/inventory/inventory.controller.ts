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
    route.get("/inventory/top-stock", authenticate, (c) =>
      this.inventoryHandler.getTopStockItems(c)
    );

    route.patch(
      "/inventory/receipt-imports/:receiptNumber",
      authenticate,
      (c) => this.inventoryHandler.updateInventoryOfReceiptImport(c)
    );

    route.get("/inventory/total", authenticate, (c) =>
      this.inventoryHandler.getTotalInventory(c)
    );

    route.get("/inventory/value", authenticate, (c) =>
      this.inventoryHandler.getTotalValueInventory(c)
    );

    route.get("/inventory/import-new", authenticate, (c) =>
      this.inventoryHandler.getTotalOfImportNew(c)
    );

    route.get("/inventory/return", authenticate, (c) =>
      this.inventoryHandler.getTotalOfReturn(c)
    );

    route.get("/inventory/import-products", authenticate, (c) =>
      this.inventoryHandler.getImportProductsDataset(c)
    );

    route.get("/inventory/category/total", authenticate, (c) =>
      this.inventoryHandler.getTotalProductInventoryByCategory(c)
    );

    route.get("/inventory/category", authenticate, (c) =>
      this.inventoryHandler.getProductInventoryByCategory(c)
    );

    route.get("/inventory/turnover", authenticate, (c) =>
      this.inventoryHandler.getProductInventoryTurnOver(c)
    );

    route.get("/inventory/dead-stock", authenticate, (c) =>
      this.inventoryHandler.getDeadStockInventory(c)
    );

    route.get("/inventory/out-of-stock-dates", authenticate, (c) =>
      this.inventoryHandler.getOutOfStockDates(c)
    );

    app.route(this.path, route);
  }
}
