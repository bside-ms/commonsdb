import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { wallets } from "./wallets";
import { users } from "./users";

export const organizationMemberRoleEnum = pgEnum("organization_member_role", [
  "MEMBER",
  "ADMIN",
]);

export const organizations = pgTable("organizations", {
  id: uuid().primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "string",
  })
    .defaultNow()
    .$onUpdate(() => new Date().toISOString())
    .notNull(),

  code: text("code").unique(),
  name: text("name").notNull(),
  bio: text("bio"),

  walletId: uuid("wallet_id")
    .references(() => wallets.id)
    .notNull(),
});

export const organizationRelations = relations(
  organizations,
  ({ one, many }) => ({
    wallet: one(wallets, {
      fields: [organizations.walletId],
      references: [wallets.id],
    }),
    members: many(organizationMembers),
  })
);

export const organizationMembers = pgTable(
  "organizationMembers",
  {
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: organizationMemberRoleEnum().default("MEMBER"),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId] })]
);

export const organizationMemberRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  })
);
