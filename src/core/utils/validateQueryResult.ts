import type { QueryResultRow } from "pg";
import { z, type ZodType } from "zod";
import { ApiError } from "../../types/api.js";

/**
 * Validates the QueryResultRow returned from the database using the provided schema.
 * Throws an ApiError if any of the validations fail.
 * If validation succeeds, it return the validated result.
 *
 * @template ReturnType - The type of the validated result.
 * @param res - The QueryResultRow returned from the database.
 * @param schema - The schema to use for validation.
 * @returns Validated result.
 * @throws {ApiError} - If the validation fails.
 */
export const validateQueryResult = <ReturnType>(
  res: QueryResultRow,
  schema: ZodType,
): ReturnType => {
  const responseValidationResult = schema.safeParse(res);
  if (!responseValidationResult.success) {
    throw new ApiError(
      500,
      "The DB query result validation failed.",
      z.prettifyError(responseValidationResult.error),
    );
  }

  return responseValidationResult.data as ReturnType;
};
