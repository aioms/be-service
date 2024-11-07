import { eq, ilike, or } from "drizzle-orm";
import { singleton, inject } from "tsyringe";
import { Context } from "hono";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";

import {
  getPagination,
  getPaginationMetadata,
  parseBodyJson,
} from "../../../common/utils/index.ts";
import { CreateUserDto, UpdateUserDto } from "../dtos/user.dto.ts";
import { UserRepository } from "../../../database/repositories/user.repository.ts";
import { userTable } from "../../../database/schemas/user.schema.ts";

@singleton()
export default class UserHandler {
  constructor(@inject(UserRepository) private userRepository: UserRepository) {}

  async createUser(ctx: Context) {
    const jwtPayload = ctx.get("jwtPayload");
    const body = await parseBodyJson<CreateUserDto>(ctx);
    const { username, password, fullname, phone, role, storeCode, status } =
      body;
    console.log({ jwtPayload });

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const { data: userRole } = await this.userRepository.findRoleByName(role);

    if (!userRole) {
      throw new Error("Can't find role");
    }

    const { data: newUser } = await this.userRepository.createUser({
      fullname,
      phone,
      storeCode,
      username,
      password: hashedPassword,
      salt,
      status,
    });

    if (!newUser.length) {
      throw new Error("Can't create user");
    }

    await this.userRepository.createUserRole({
      userId: newUser[0].id,
      roleId: userRole.id,
    });

    return ctx.json({
      data: { id: newUser[0].id },
      success: true,
      statusCode: 201,
    });
  }

  async updateUser(ctx: Context) {
    const body = await parseBodyJson<UpdateUserDto>(ctx);
    const { id, password, fullname, phone, role, storeCode, status } = body;
    const dataUpdate: Record<string, any> = {
      updatedAt: dayjs().toISOString(),
    };

    if (fullname) dataUpdate.fullname = fullname;
    if (phone) dataUpdate.phone = phone;
    if (storeCode) dataUpdate.storeCode = storeCode;
    if (status) dataUpdate.status = status;

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      dataUpdate.password = hashedPassword;
      dataUpdate.salt = salt;
      dataUpdate.tokenVersion = nanoid();
    }

    if (role) {
      const { data: userRole } = await this.userRepository.findRoleByName(role);

      if (!userRole) {
        throw new Error("Can't find role");
      }

      await Promise.all([
        this.userRepository.deleteUserRoles(id),
        this.userRepository.createUserRole({
          userId: id,
          roleId: userRole.id,
        }),
      ]);
    }

    const { data: userUpdated } = await this.userRepository.updateUser({
      set: dataUpdate,
      where: [eq(userTable.id, id)],
    });

    if (!userUpdated.length) {
      throw new Error("Can't update user");
    }

    return ctx.json({
      data: { id },
      success: true,
      statusCode: 200,
    });
  }

  async softDeleteUser(ctx: Context) {
    const id = ctx.req.param("id");

    const { data: user } = await this.userRepository.findUserById(id, {
      select: {
        username: userTable.username,
      },
    });
    if (!user) {
      throw new Error("User not found");
    }

    const now = dayjs().toISOString();
    const username = `${user.username}__deleted__${now}`;
    const { data: deletedUsers } = await this.userRepository.updateUser({
      set: {
        username: username,
        deletedAt: now,
      },
      where: [eq(userTable.id, id)],
    });
    if (!deletedUsers.length) {
      throw new Error("Can't delete user");
    }

    return ctx.json({
      success: true,
      statusCode: 204,
    });
  }

  async getUserById(ctx: Context) {
    const userId = ctx.req.param("id");

    const { data: user } = await this.userRepository.findUserById(userId, {
      select: {
        id: userTable.id,
        username: userTable.username,
        fullname: userTable.fullname,
        phone: userTable.phone,
        status: userTable.status,
        storeCode: userTable.storeCode,
      },
    });
    if (!user) {
      throw new Error("User not found");
    }

    return ctx.json({
      data: user,
      success: true,
      statusCode: 200,
    });
  }

  async getUsersByFilter(ctx: Context) {
    const query = ctx.req.query();
    const { keyword, status } = query;
    const filters: any = [];

    if (keyword) {
      filters.push(
        or(ilike(userTable.fullname, keyword), ilike(userTable.phone, keyword)),
      );
    }

    if (status) {
      filters.push(eq(userTable.status, status));
    }

    const { page, limit, offset } = getPagination({
      page: +(query.page || 1),
      limit: +(query.limit || 10),
    });

    const { data: users, count } =
      await this.userRepository.findUsersByCondition({
        select: {
          id: userTable.id,
          username: userTable.username,
          fullname: userTable.fullname,
          phone: userTable.phone,
          status: userTable.status,
          storeCode: userTable.storeCode,
        },
        where: filters,
        limit,
        offset,
        isCount: true,
      });

    const metadata = getPaginationMetadata(page, limit, offset, count!);

    return ctx.json({
      data: users,
      metadata,
      success: true,
      statusCode: 200,
    });
  }
}
