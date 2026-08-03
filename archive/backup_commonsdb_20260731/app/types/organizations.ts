import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import type {
  organizationMembers,
  organizations,
} from "~/server/database/schema";
import type { User } from "./users";

export enum OrganizationMemberRole {
  MEMBER = "MEMBER",
  ADMIN = "ADMIN",
}

export type Organization = InferSelectModel<typeof organizations>;
export type InsertOrganization = InferInsertModel<typeof organizations>;

export type OrganizationMember = InferSelectModel<typeof organizationMembers>;

export interface WithMember {
  members: OrganizationMember[];
}
export interface WithMembersAndUser {
  members: (OrganizationMember & { user: User })[];
}
