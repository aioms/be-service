import "reflect-metadata";

import { Hono } from "hono";
import { container } from "tsyringe";

import { authenticate } from "../../common/middlewares/verify-jwt.ts";
import ProductHandler from "./handlers/product.ts";
import ReceiptImportHandler from "./handlers/receipt-import.ts";
import ReceiptReturnHandler from "./handlers/receipt-return.ts";
import ReceiptItemHandler from "./handlers/receipt-item.ts";

export default class ProductController {
  private readonly productHandler = container.resolve(ProductHandler);
  private readonly receiptItemHandler = container.resolve(ReceiptItemHandler);
  private readonly receiptImportHandler =
    container.resolve(ReceiptImportHandler);
  private readonly receiptReturnHandler =
    container.resolve(ReceiptReturnHandler);

  private readonly path = "/api/v1";

  init(app: Hono) {
    const route = new Hono();

    route.get("/categories", authenticate, (c) =>
      this.productHandler.getCategories(c),
    );

    route.get("/suppliers", authenticate, (c) =>
      this.productHandler.getSuppliers(c),
    );

    route.get("/units", authenticate, (c) => this.productHandler.getUnits(c));

    /**
     * PRODUCT
     */
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

    /**
     * RECEIPT ITEM
     */
    route.post("/receipt-items", authenticate, (c) =>
      this.receiptItemHandler.createReceiptItem(c),
    );

    route.put("/receipt-items/:id", authenticate, (c) =>
      this.receiptItemHandler.updateReceiptItem(c),
    );

    route.delete("/receipt-items/:id", authenticate, (c) =>
      this.receiptItemHandler.deleteReceiptItem(c),
    );

    /**
     * RECEIPT IMPORT
     */
    route.post("/receipt-imports", authenticate, (c) =>
      this.receiptImportHandler.createReceipt(c),
    );

    route.put("/receipt-imports/:id", authenticate, (c) =>
      this.receiptImportHandler.updateReceipt(c),
    );

    route.delete("/receipt-imports/:id", authenticate, (c) =>
      this.receiptImportHandler.deleteReceipt(c),
    );

    route.get("/receipt-imports/:id", authenticate, (c) =>
      this.receiptImportHandler.getReceiptById(c),
    );

    route.get("/receipt-imports", authenticate, (c) =>
      this.receiptImportHandler.getReceiptsByFilter(c),
    );

    route.get("/receipt-imports/receipt-items/:receiptNumber", authenticate, (c) =>
      this.receiptImportHandler.getReceiptItemsByBarcode(c),
    );

    /**
     * RECEIPT RETURN
     */
    route.post("/receipt-return", authenticate, (c) =>
      this.receiptReturnHandler.createReceipt(c),
    );

    route.put("/receipt-return/:id", authenticate, (c) =>
      this.receiptReturnHandler.updateReceipt(c),
    );

    route.delete("/receipt-return/:id", authenticate, (c) =>
      this.receiptReturnHandler.deleteReceipt(c),
    );

    route.get("/receipt-return/:id", authenticate, (c) =>
      this.receiptReturnHandler.getReceiptById(c),
    );

    route.get("/receipt-return", authenticate, (c) =>
      this.receiptReturnHandler.getReceiptsByFilter(c),
    );

    route.get("/receipt-return/receipt-items/:receiptNumber", authenticate, (c) =>
      this.receiptReturnHandler.getReceiptItemsByBarcode(c),
    );

    app.route(this.path, route);
  }
}
