import { relations } from "drizzle-orm";
import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { wallets } from "./wallets";
import { usersOnTaskOccurrences, usersOnTasks } from "./tasks";
import { organizationMembers } from "./organizations";

export const users = pgTable("users", {
  id: uuid().primaryKey().notNull(),
  email: text("email").notNull(),
  username: text("username"),
  firstname: text("firstname"),
  lastname: text("lastname"),

  walletId: uuid("wallet_id")
    .references(() => wallets.id)
    .notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [users.walletId],
    references: [wallets.id],
  }),
  taskResponsibilities: many(usersOnTasks),
  taskOccurrenceResponsibilities: many(usersOnTaskOccurrences),
  organizationMemberships: many(organizationMembers),
}));
