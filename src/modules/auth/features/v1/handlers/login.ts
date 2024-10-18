import { Context } from "hono";
import { sign } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { sql } from "drizzle-orm/sql";
import { inject, injectable } from "tsyringe";
import bcrypt from "bcryptjs";

import { LoginDto } from "../dtos/login.dto.ts";
import { parseBodyJson } from "../../../../../common/utils/index.ts";
import { userTable } from "../../../schemas/user.schema.ts";
import { UserStatus } from "../../../enums/auth.enum.ts";
import { UserRepository } from "../../../../../database/repositories/user.repository.ts";
import config from "../../../../../common/config/index.ts";

@injectable()
export default class LoginHandler {
  constructor(@inject(UserRepository) private userRepository: UserRepository) {}

  async loginWithPassword(ctx: Context) {
    try {
      const body = await parseBodyJson<LoginDto>(ctx);
      console.log({ body, that: this });

      const [user] = await this.userRepository.findUsersByCondition({
        select: {
          id: userTable.id,
          fullname: userTable.fullname,
          password: userTable.password,
          salt: userTable.salt,
        },
        where: sql`${userTable.username} = ${body.username} AND ${userTable.status} = ${UserStatus.active}`,
      });

      if (!user) {
        throw new HTTPException(404, { message: "User not found or inactive" });
      }

      const hashedPassword = bcrypt.hashSync(user.password, user.salt);
      console.log({ hashedPassword });

      const payload = {
        sub: "user123",
        role: "admin",
        exp: Math.floor(Date.now() / 1000) + 60 * 5, // Token expires in 5 minutes
      };
      const token = await sign(payload, config.authJwtSecret);

      return ctx.json({
        message: "Ok",
        data: { token },
      });
    } catch (error) {
      console.error(error as Error);

      return ctx.json({
        message: error.message,
        success: false,
      });
    }
  }

  logout(ctx: Context) {
    try {
      const user = ctx.get("user");
      const query = ctx.req.query();
      console.log({ query, user });

      return ctx.json({
        message: "Ok",
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
