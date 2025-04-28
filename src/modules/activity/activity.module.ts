import { Hono } from "hono";
import { container, registry } from "tsyringe";

import { UserActivityRepository } from "../../database/repositories/user-activity.repository.ts";

import ActivityController from "./activity.controller.ts";

@registry([
  {
    token: UserActivityRepository,
    useClass: UserActivityRepository,
  },
])
export default class ActivityModule {
  static init(app: Hono) {
    const controller = container.resolve(ActivityController);
    controller.init(app);
  }
}
