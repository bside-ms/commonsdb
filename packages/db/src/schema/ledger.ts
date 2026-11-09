import { relations, sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './auth.ts';
import { shift } from './tasks.ts';

/** Anything that can hold repros. */
export const ACCOUNT_KINDS = ['user', 'initiative'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/** 'adjustment' is a manual entry. */
export const LEDGER_KINDS = ['shift_credit', 'adjustment'] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export const ledgerAccount = pgTable(
	'ledger_account',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		kind: text('kind', { enum: ACCOUNT_KINDS }).notNull(),
		/** Set for kind 'user'. Null after the user is deleted; the history stays. */
		userId: text('user_id')
			.unique()
			.references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [check('ledger_account_kind_check', sql`${t.kind} in ('user', 'initiative')`)]
);

/**
 * Single-entry, append-only (trigger in migration 0004). Balance = sum of
 * amounts. Corrections are new entries, never updates.
 * Amounts in integer tenths, like shift hours (repros = hours 1:1).
 */
export const ledgerEntry = pgTable(
	'ledger_entry',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		accountId: uuid('account_id')
			.notNull()
			.references(() => ledgerAccount.id, { onDelete: 'restrict' }),
		amountTenths: integer('amount_tenths').notNull(),
		kind: text('kind', { enum: LEDGER_KINDS }).notNull(),
		/** Free-text reason ("Verwendungszweck"). Required for adjustments. */
		memo: text('memo'),
		shiftId: uuid('shift_id').references(() => shift.id, { onDelete: 'restrict' }),
		/** Who posted it. Audit field: no FK, so it survives user deletion. */
		actorId: text('actor_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('ledger_entry_account_idx').on(t.accountId, t.createdAt),
		uniqueIndex('ledger_entry_shift_credit_uniq')
			.on(t.shiftId)
			.where(sql`${t.kind} = 'shift_credit'`),
		check('ledger_entry_amount_check', sql`${t.amountTenths} <> 0`),
		check('ledger_entry_kind_check', sql`${t.kind} in ('shift_credit', 'adjustment')`),
		check(
			'ledger_entry_shift_credit_check',
			sql`${t.kind} <> 'shift_credit' or (${t.shiftId} is not null and ${t.amountTenths} > 0)`
		),
		check(
			'ledger_entry_adjustment_memo_check',
			sql`${t.kind} <> 'adjustment' or ${t.memo} is not null`
		)
	]
);

export const ledgerAccountRelations = relations(ledgerAccount, ({ one, many }) => ({
	user: one(user, { fields: [ledgerAccount.userId], references: [user.id] }),
	entries: many(ledgerEntry)
}));

export const ledgerEntryRelations = relations(ledgerEntry, ({ one }) => ({
	account: one(ledgerAccount, { fields: [ledgerEntry.accountId], references: [ledgerAccount.id] }),
	shift: one(shift, { fields: [ledgerEntry.shiftId], references: [shift.id] })
}));

export type LedgerAccount = typeof ledgerAccount.$inferSelect;
export type LedgerEntry = typeof ledgerEntry.$inferSelect;
