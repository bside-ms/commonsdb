import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { shift } from './tasks.ts';
import { profile } from './profile.ts';

/**
 * Work done by someone without an account (slice 12b). The shift is
 * confirmed on site without an assignee; this row holds the one-time
 * code (hashed) that later credits it to whoever redeems it. No ledger
 * entry until then.
 */
export const shiftClaim = pgTable(
	'shift_claim',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		shiftId: uuid('shift_id')
			.notNull()
			.unique()
			.references(() => shift.id, { onDelete: 'cascade' }),
		/** sha256 of the normalised code; the code itself is only on the slip. */
		codeHash: text('code_hash').notNull().unique(),
		/** Optional, shown instead of "Gast" until claimed. */
		guestName: text('guest_name'),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		/** Audit fields, no FK. */
		createdBy: text('created_by').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		claimedBy: text('claimed_by'),
		claimedAt: timestamp('claimed_at', { withTimezone: true })
	},
	(t) => [index('shift_claim_open_idx').on(t.claimedAt, t.createdAt)]
);

export const shiftClaimRelations = relations(shiftClaim, ({ one }) => ({
	shift: one(shift, { fields: [shiftClaim.shiftId], references: [shift.id] }),
	creator: one(profile, { fields: [shiftClaim.createdBy], references: [profile.userId] })
}));
