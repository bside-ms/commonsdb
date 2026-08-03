import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", [
  "TRANSFER_IN",
  "TRANSFER_OUT",
]);

export const wallets = pgTable("wallets", {
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
});

export const walletRelations = relations(wallets, ({ many }) => ({
  transactions: many(walletTransactions),
}));

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid().primaryKey().defaultRandom().notNull(),
  walletId: uuid("wallet_id")
    .references(() => wallets.id)
    .notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
  })
    .defaultNow()
    .notNull(),

  type: walletTransactionTypeEnum(),
  amount: integer("amount").notNull(),
  comment: text("comment"),
});

export const walletTransactionRelations = relations(
  walletTransactions,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [walletTransactions.walletId],
      references: [wallets.id],
    }),
  })
);
