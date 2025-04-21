import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import type {
  organizationMembers,
  organizations,
} from "~/server/database/schema";

export enum OrganizationMemberRole {
  MEMBER = "MEMBER",
  ADMIN = "ADMIN",
}

export type Organization = InferSelectModel<typeof organizations>;
export type InsertOrganization = InferInsertModel<typeof organizations>;

export type OrganizationMember = InferSelectModel<typeof organizationMembers>;
