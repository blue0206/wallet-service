import z from "zod";

// Users Table row in DB.
export const UserInDBSchema = z.object({
  id: z.uuidv4(),
  username: z.string(),
  email: z.email(),
  created_at: z.coerce.date(),
});
export type UserInDB = z.infer<typeof UserInDBSchema>;

// Request Body schema for registering new user.
export const RegisterUserRequestBodySchema = z.object({
  username: z
    .string()
    .min(1, { error: "Username is required." })
    .max(50, "Username must be less than 50 characters long."),
  email: z.email({ error: "Invalid email." }),
});
export type RegisterUserRequestBody = z.infer<
  typeof RegisterUserRequestBodySchema
>;
