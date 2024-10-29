import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z, ZodIssue } from "zod";
import { PaginationParams, PaginationResult } from "../types/pagination.d.ts";

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

export const getPagination = ({ page = 1, limit = 10 }: PaginationParams) => {
  // Ensure the page and limit are at least 1
  const validatedPage = Math.max(page, 1);
  let validatedLimit = Math.max(limit, 1);

  if (validatedLimit > 50) {
    validatedLimit = 50;
  }

  // Calculate the offset for the SQL query
  const offset = (validatedPage - 1) * validatedLimit;
  return { offset, page: validatedPage, limit: validatedLimit };
};

export const getPaginationMetadata = (
  page: number,
  limit: number,
  offset: number,
  totalItems: number,
): PaginationResult => {
  // Calculate total number of pages
  const totalPages = Math.ceil(totalItems / limit);

  // Determine if there are next and previous pages
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  return {
    offset,
    limit,
    totalItems,
    totalPages,
    currentPage: page,
    hasNext,
    hasPrevious,
  };
};

export function formatError(error: z.ZodError) {
  const errors = error.flatten((issue: ZodIssue) => ({
    message: issue.message,
    errorCode: issue.code,
  }));
  return errors;
}

export function formatValidation(result, ctx) {
  const isSuccess = result.success;

  if (!isSuccess) {
    const issues = result.error.issues;
    const message = issues
      .map((issue) => `${issue.message} at ${issue.path.join(".")}`)
      .join(" | ");
    const errorMessage = `Validation error: ${message}`;

    return ctx.json({
      errors: formatError(result.error),
      message: errorMessage,
      success: isSuccess,
    });
  }
}
