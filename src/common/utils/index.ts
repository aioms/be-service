import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export async function parseBodyJson<T>(ctx: Context) {
  try {
    return (await ctx.req.json()) as T;
  } catch (_error) {
    throw new HTTPException(400, { message: "Body must be a valid JSON" });
  }
}

export function generateUniqueString(length: number = 12): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let uniqueString = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    uniqueString += characters[randomIndex];
  }
  return uniqueString;
}
