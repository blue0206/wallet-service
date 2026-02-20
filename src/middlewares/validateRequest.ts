import z from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../types/api.js";

interface ValidationArgsType {
  bodySchema?: ZodType | null;
  paramsSchema?: ZodType;
  querySchema?: ZodType;
}

/**
 * Validate Request middleware.
 *
 * Validates the request body, params, and query using Zod.
 * If any of the validations fail, an ApiError is thrown.
 *
 * @param {ValidationArgsType} args - Validation arguments.
 * @property {ZodType | null} args.bodySchema - Zod schema for body validation.
 * @property {ZodType | null} args.paramsSchema - Zod schema for params validation.
 * @property {ZodType | null} args.querySchema - Zod schema for query validation.
 */
const validateRequest =
  (args: ValidationArgsType) =>
  async (
    req: Request<unknown, unknown, unknown, unknown>,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const [body, params, query] = await Promise.all([
      args.bodySchema ? args.bodySchema.safeParseAsync(req.body) : null,
      args.paramsSchema ? args.paramsSchema.safeParseAsync(req.params) : null,
      args.querySchema ? args.querySchema.safeParseAsync(req.query) : null,
    ]);

    // Updated req.body with validated body as Zod
    // also handles type conversions.
    if (body) {
      if (body.success) {
        req.body = body.data;
      } else {
        throw new ApiError(
          400,
          "Bad Request: body validation failed.",
          z.prettifyError(body.error),
        );
      }
    }

    if (params && !params.success) {
      throw new ApiError(
        400,
        "Bad Request: params validation failed.",
        z.prettifyError(params.error),
      );
    }

    if (query && !query.success) {
      throw new ApiError(
        400,
        "Bad Request: query validation failed.",
        z.prettifyError(query.error),
      );
    }

    next();
  };

export default validateRequest;
