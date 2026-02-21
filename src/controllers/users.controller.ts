import type { Request, Response } from "express";
import { RegisterUserRequestBody } from "../schemas/users.schema.js";
import { userService } from "../services/users.service.js";
import { ApiResponse } from "../types/api.js";
import { RegisterUserServiceResult } from "../types/users.js";

export const registerUser = async (
  req: Request<unknown, unknown, RegisterUserRequestBody>,
  res: Response,
): Promise<void> => {
  const result = await userService.register(req.log, {
    username: req.body.username,
    email: req.body.email,
    requestId: req.requestId,
    clientDetails: req.clientDetails,
  });

  const responseBody: ApiResponse<RegisterUserServiceResult> = {
    success: true,
    statusCode: 201,
    payload: result,
  };

  res.status(201).json(responseBody);
};
