import { Router } from "express";
import assignClientDetails from "../middlewares/assignClientDetails.js";
import validateRequest from "../middlewares/validateRequest.js";
import { RegisterUserRequestBodySchema } from "../schemas/users.schema.js";
import { registerUser } from "../controllers/users.controller.js";

const userRouter = Router();

userRouter.post(
  "/users",
  assignClientDetails,
  validateRequest({ bodySchema: RegisterUserRequestBodySchema }),
  registerUser,
);

export default userRouter;
