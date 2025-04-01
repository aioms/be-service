import { Hono } from "hono";
import { container, registry } from "tsyringe";
import SupplierController from "./supplier.controller.ts";
import { SupplierRepository } from "../../database/repositories/supplier.repository.ts";

@registry([
  {
    token: SupplierRepository,
    useClass: SupplierRepository,
  },
])
export default class SupplierModule {
  static init(app: Hono) {
    const controller = container.resolve(SupplierController);
    controller.init(app);
  }
}
