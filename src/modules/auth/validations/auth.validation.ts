import { z, ZodType } from "zod";
import { LoginDto } from "../dtos/auth.dto.ts";

export const loginSchema = z.object({
  username: z.string({ message: "Username must not be empty" }),
  password: z.string({ message: "Password must not be empty" }),
}) satisfies ZodType<LoginDto>;
