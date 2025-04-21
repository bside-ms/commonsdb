import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import type { users } from "~/server/database/schema";

export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

export enum USER_ROLES {
  USER = "commonsdb_user",
  ADMIN = "commonsdb_admin",
}
