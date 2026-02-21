import z from "zod";

// // This represents the Users Table row in DB.
const _UserInDBSchema = z.object({
  id: z.uuidv4(),
  username: z.string(),
  email: z.email(),
  created_at: z.coerce.date(),
});

// This schema is for use throughout the application.
export const UserInDBSchema = _UserInDBSchema.transform((data) => ({
  id: data.id,
  username: data.username,
  email: data.email,
  createdAt: data.created_at,
}));
export type UserInDB = z.infer<typeof UserInDBSchema>;

// This schema is for validating SELECT statement results.
export const UserInDBSelectSchema = _UserInDBSchema
  .partial()
  .transform((data) => ({
    id: data.id,
    username: data.username,
    email: data.email,
    createdAt: data.created_at,
  }));
export type UserInDBSelect = z.infer<typeof UserInDBSelectSchema>;
