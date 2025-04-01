import { Context } from "hono";
import { sign } from "hono/jwt";
import { inject, injectable } from "tsyringe";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

import config from "../../../common/config/index.ts";
import { LoginDto } from "../dtos/auth.dto.ts";
import { parseBodyJson } from "../../../common/utils/index.ts";
import { userTable } from "../../../database/schemas/user.schema.ts";
import { AuthRepository } from "../../../database/repositories/auth.repository.ts";

@injectable()
export default class LoginHandler {
  constructor(@inject(AuthRepository) private authRepository: AuthRepository) {}

  async loginWithPassword(ctx: Context) {
    const body = await parseBodyJson<LoginDto>(ctx);

    const user = await this.authRepository.findUserByUsername(body.username, {
      select: {
        id: userTable.id,
        fullname: userTable.fullname,
        username: userTable.username,
        password: userTable.password,
        salt: userTable.salt,
        role: userTable.role,
      },
    });

    if (!user) {
      return ctx.json({
        message: "User not found or inactive",
        success: false,
        statusCode: 400,
      });
    }

    const hashedPassword = bcrypt.hashSync(body.password, user.salt);

    if (hashedPassword !== user.password) {
      return ctx.json({
        message: "Sai mật khẩu",
        success: false,
        statusCode: 400,
      });
    }

    // const roles = await this.authRepository.findRolesOfUser(user.id);
    // const roleIds = roles.map((r) => r.roleId);

    const tokenVersion = nanoid(5);
    const roles = [user.role];
    const payload = {
      v: tokenVersion,
      sub: user.id,
      fullname: user.fullname,
      roles,
    };

    const [token] = await Promise.all([
      sign(payload, config!.authJwtSecret),
      this.authRepository.updateTokenVersion(user.id, tokenVersion),
    ]);

    return ctx.json({
      statusCode: 200,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullname: user.fullname,
          roles,
          storeCode: user.storeCode,
        },
      },
    });
  }

  async logout(ctx: Context) {
    const jwtPayload = ctx.get("jwtPayload");
    const tokenVersion = nanoid(5);
    await this.authRepository.updateTokenVersion(jwtPayload.sub, tokenVersion);

    return ctx.json({
      success: true,
      statusCode: 204,
    });
  }
}
