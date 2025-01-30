import "reflect-metadata";

import { Hono } from "hono";
import { container } from "tsyringe";

import { authenticate } from "../../common/middlewares/verify-jwt.ts";
import ReceiptCheckHandler from "./handlers/receipt-check.ts";

export default class ReceiptController {
  private readonly receiptCheckHandler =
    container.resolve(ReceiptCheckHandler);

  private readonly path = "/api/v1";

  init(app: Hono) {
    const route = new Hono();

    /**
     * RECEIPT CHECK
     */
    route.post("/receipt-check", authenticate, (c) =>
      this.receiptCheckHandler.createReceipt(c),
    );

    route.put("/receipt-check/:id", authenticate, (c) =>
      this.receiptCheckHandler.updateReceipt(c),
    );

    route.delete("/receipt-check/:id", authenticate, (c) =>
      this.receiptCheckHandler.deleteReceipt(c),
    );

    route.get("/receipt-check/:id", authenticate, (c) =>
      this.receiptCheckHandler.getReceiptById(c),
    );

    route.get("/receipt-check", authenticate, (c) =>
      this.receiptCheckHandler.getReceiptsByFilter(c),
    );

    route.get("/receipt-check/receipt-items/:receiptNumber", authenticate, (c) =>
      this.receiptCheckHandler.getReceiptItemsByBarcode(c),
    );

    app.route(this.path, route);
  }
}
