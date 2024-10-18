import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import bcrypt from "bcryptjs";

import { LoginDto } from "../dtos/login.dto.ts";
import { parseBodyJson } from "../../../../../common/utils/index.ts";

@singleton()
export default class UserHandler {
  async createUser(ctx: Context) {
    try {
      const body = await parseBodyJson<LoginDto>(ctx);
      console.log({ body });

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(body.password, salt);

      return ctx.json({
        message: "Ok",
        data: { hashedPassword },
      });
    } catch (error) {
      console.error(error as Error);

      return ctx.json({
        message: error.message,
        success: false,
      });
    }
  }
}
