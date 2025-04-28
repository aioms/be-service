import "reflect-metadata";

import { Hono } from "hono";
import { container } from "tsyringe";

import { authenticate } from "../../common/middlewares/verify-jwt.ts";
import ActivityHandler from "./handlers/activity.ts";

export default class ActivityController {
  private readonly activityHandler = container.resolve(ActivityHandler);

  private readonly path = "/api/v1/activities";

  init(app: Hono) {
    const route = new Hono();

    route.get("/recent", authenticate, (c) =>
      this.activityHandler.getRecentActivities(c)
    );

    app.route(this.path, route);
  }
}
