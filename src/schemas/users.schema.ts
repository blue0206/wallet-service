import z from "zod";

// Users Table row in DB.
export const UserInDBSchema = z.object({
  id: z.uuidv4(),
  username: z.string(),
  email: z.email(),
  created_at: z.coerce.date(),
});
export type UserInDB = z.infer<typeof UserInDBSchema>;
