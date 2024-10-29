import { z, ZodType } from "zod";
import {
  CreateUserDto,
  DeleteUserDto,
  UpdateUserDto,
} from "../dtos/user.dto.ts";
import { StoreCode, UserStatus } from "../enums/user.enum.ts";
import { Role } from "../../../common/enums/index.ts";

export const createUserSchema = z.object({
  username: z.string({ message: "Username must not be empty" }),
  password: z.string({ message: "Password must not be empty" }),
  fullname: z.string({ message: "Fullname must not be empty" }),
  phone: z.string({ message: "Phone number must not be empty" }),
  role: z.enum([Role.ADMIN, Role.USER], { message: "Role is invalid" }),
  storeCode: z.nativeEnum(StoreCode),
  status: z.nativeEnum(UserStatus, { message: "Status is invalid" }),
}) satisfies ZodType<CreateUserDto>;

export const updateUserSchema = z.object({
  id: z.string({ message: "User ID must not be empty" }).uuid(),
  password: z.string({ message: "Password must not be empty" }).optional(),
  fullname: z.string({ message: "Fullname must not be empty" }).optional(),
  phone: z.string({ message: "Phone number must not be empty" }).optional(),
  role: z
    .enum([Role.ADMIN, Role.USER], { message: "Role is invalid" })
    .optional(),
  storeCode: z.nativeEnum(StoreCode).optional(),
  status: z.nativeEnum(UserStatus, { message: "Status is invalid" }).optional(),
}) satisfies ZodType<Partial<UpdateUserDto>>;
