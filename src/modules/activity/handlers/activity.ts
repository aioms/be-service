import { singleton, inject } from "tsyringe";
import { Context } from "hono";

import { UserActivityRepository } from "../../../database/repositories/user-activity.repository.ts";

@singleton()
export default class ActivityHandler {
  constructor(
    @inject(UserActivityRepository)
    private readonly repository: UserActivityRepository,
  ) {}

  async getRecentActivities(ctx: Context) {
    const jwtPayload = ctx.get("jwtPayload");
    const userId = jwtPayload.sub;
    const { data } = await this.repository.getRecentActivities(userId);

    return ctx.json({
      data,
      success: true,
      statusCode: 200,
    });
  }
}
