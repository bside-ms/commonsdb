/*
 * Guest credit (slice 12b). On an Aktion, people without an account can
 * do tasks; whoever runs the day confirms the work and hands out a code.
 * The repros are credited when someone redeems it (or an admin assigns
 * it). Codes run out after CLAIM_VALID_MONTHS; admins can still assign.
 */
import { and, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { action, category, profile, shift, shiftClaim, task } from '@commonsdb/db/schema';
import { DomainError } from '../errors.ts';
import { isAdmin, type Actor } from '../roles.ts';
import { parse } from '../validation.ts';
import { isActionLead } from '../actions/service.ts';
import { assertManagesCategory, canManageCategory, manageableCategories } from '../tasks/policy.ts';
import { localToday } from '../tasks/shifts.ts';
import { confirmGuestShift, creditGuestShift } from '../tasks/guest-shifts.ts';
import { hashCode, newClaimCode } from './code.ts';
import {
	AssignClaimInput,
	CLAIM_VALID_MONTHS,
	GuestWorkInput,
	LEAD_DAYS_AFTER,
	RedeemInput
} from './schema.ts';

const expiry = () => sql`now() + ${`${CLAIM_VALID_MONTHS} months`}::interval`;

/** 'YYYY-MM-DD' + n days, as a date string. */
function addDays(day: string, n: number) {
	const d = new Date(`${day}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

// ---- who may record ---------------------------------------------------------

/** Admin of the task's category, or a lead of its published Aktion in the lead window. */
async function canRecordForTask(db: Db, actor: Actor, taskId: string, today: string) {
	const [t] = await db
		.select({
			categoryId: task.categoryId,
			deletedAt: task.deletedAt,
			actionId: task.actionId,
			actionDate: action.date,
			published: action.publishedAt
		})
		.from(task)
		.leftJoin(action, eq(action.id, task.actionId))
		.where(eq(task.id, taskId));
	if (!t || t.deletedAt) throw new DomainError('task_not_found');
	if (await canManageCategory(db, actor, t.categoryId)) return true;
	if (!t.actionId || !t.published || !t.actionDate) return false;
	if (today < t.actionDate || today > addDays(t.actionDate, LEAD_DAYS_AFTER)) return false;
	return isActionLead(db, actor, t.actionId);
}

/**
 * For the Aktion page: show "Gast eintragen"? Admins: yes (category is
 * checked per task). Leads: on the day until LEAD_DAYS_AFTER.
 */
export async function canRecordGuestsForAction(
	db: Db,
	actor: Actor,
	actionId: string,
	{ today = localToday() }: { today?: string } = {}
) {
	if (isAdmin(actor)) return true;
	const a = await db.query.action.findFirst({
		where: eq(action.id, actionId),
		columns: { date: true, publishedAt: true }
	});
	if (!a?.publishedAt) return false;
	if (today < a.date || today > addDays(a.date, LEAD_DAYS_AFTER)) return false;
	return isActionLead(db, actor, actionId);
}

// ---- recording --------------------------------------------------------------

/** Confirm guest work on a task and issue its code. The code is only returned here. */
export async function recordGuestWork(
	db: Db,
	actor: Actor,
	input: unknown,
	{ today = localToday() }: { today?: string } = {}
): Promise<{ code: string; expiresAt: Date }> {
	const { taskId, hours, guestName } = parse(GuestWorkInput, input);
	if (!(await canRecordForTask(db, actor, taskId, today))) throw new DomainError('forbidden');

	const code = newClaimCode();
	return db.transaction(async (tx) => {
		const shiftId = await confirmGuestShift(tx, { taskId, hoursTenths: hours, actorId: actor.id });
		const [claim] = await tx
			.insert(shiftClaim)
			.values({
				shiftId,
				codeHash: hashCode(code),
				guestName,
				expiresAt: expiry(),
				createdBy: actor.id
			})
			.returning({ expiresAt: shiftClaim.expiresAt });
		return { code, expiresAt: claim.expiresAt };
	});
}

// ---- redeeming --------------------------------------------------------------

export type RedeemResult = { taskId: string; taskTitle: string; hoursTenths: number };

async function claimInto(
	db: Db,
	c: { id: string; shiftId: string; createdBy: string },
	userId: string
) {
	await db.transaction(async (tx) => {
		const [row] = await tx
			.update(shiftClaim)
			.set({ claimedBy: userId, claimedAt: new Date() })
			.where(and(eq(shiftClaim.id, c.id), isNull(shiftClaim.claimedAt)))
			.returning({ id: shiftClaim.id });
		if (!row) throw new DomainError('claim_used');
		await creditGuestShift(tx, { shiftId: c.shiftId, userId, confirmedBy: c.createdBy });
	});
}

/** A member redeems a code: the shift becomes theirs and is credited. */
export async function redeemGuestCode(db: Db, actor: Actor, input: unknown): Promise<RedeemResult> {
	const { code } = parse(RedeemInput, input);
	const [c] = await db
		.select({
			id: shiftClaim.id,
			shiftId: shiftClaim.shiftId,
			createdBy: shiftClaim.createdBy,
			expiresAt: shiftClaim.expiresAt,
			claimedAt: shiftClaim.claimedAt,
			taskId: task.id,
			taskTitle: task.title,
			hoursTenths: shift.hoursTenths
		})
		.from(shiftClaim)
		.innerJoin(shift, eq(shift.id, shiftClaim.shiftId))
		.innerJoin(task, eq(task.id, shift.taskId))
		.where(eq(shiftClaim.codeHash, hashCode(code)));
	if (!c) throw new DomainError('claim_not_found');
	if (c.claimedAt) throw new DomainError('claim_used');
	if (c.expiresAt < new Date()) throw new DomainError('claim_expired');

	await claimInto(db, c, actor.id);
	return { taskId: c.taskId, taskTitle: c.taskTitle, hoursTenths: c.hoursTenths };
}

// ---- admins -----------------------------------------------------------------

export type GuestClaimItem = {
	id: string;
	guestName: string | null;
	hoursTenths: number;
	task: { id: string; title: string };
	actionTitle: string | null;
	createdBy: string | null;
	createdAt: Date;
	expiresAt: Date;
	claimedBy: string | null;
	claimedAt: Date | null;
	state: 'open' | 'expired' | 'claimed';
};

/** Claims in the admin's categories: open and expired first, then the latest claimed. */
export async function listGuestClaimsForAdmin(db: Db, actor: Actor): Promise<GuestClaimItem[]> {
	const scope = await manageableCategories(db, actor);
	if (scope !== 'all' && scope.length === 0) return [];
	const where: SQL[] = [];
	if (scope !== 'all') where.push(inArray(task.categoryId, scope));

	const creator = sql<
		string | null
	>`(select display_name from profile where user_id = ${shiftClaim.createdBy})`;
	const claimer = sql<
		string | null
	>`(select display_name from profile where user_id = ${shiftClaim.claimedBy})`;

	const rows = await db
		.select({
			id: shiftClaim.id,
			guestName: shiftClaim.guestName,
			hoursTenths: shift.hoursTenths,
			taskId: task.id,
			taskTitle: task.title,
			actionTitle: action.title,
			createdBy: creator,
			createdAt: shiftClaim.createdAt,
			expiresAt: shiftClaim.expiresAt,
			claimedBy: claimer,
			claimedAt: shiftClaim.claimedAt
		})
		.from(shiftClaim)
		.innerJoin(shift, eq(shift.id, shiftClaim.shiftId))
		.innerJoin(task, eq(task.id, shift.taskId))
		.innerJoin(category, eq(category.id, task.categoryId))
		.leftJoin(action, eq(action.id, task.actionId))
		.where(where.length ? and(...where) : undefined)
		.orderBy(sql`${shiftClaim.claimedAt} is not null`, desc(shiftClaim.createdAt))
		.limit(200);

	const now = new Date();
	return rows.map((r) => ({
		id: r.id,
		guestName: r.guestName,
		hoursTenths: r.hoursTenths,
		task: { id: r.taskId, title: r.taskTitle },
		actionTitle: r.actionTitle,
		createdBy: r.createdBy,
		createdAt: r.createdAt,
		expiresAt: r.expiresAt,
		claimedBy: r.claimedBy,
		claimedAt: r.claimedAt,
		state: r.claimedAt ? 'claimed' : r.expiresAt < now ? 'expired' : 'open'
	}));
}

/** An unclaimed claim in a category the actor manages. */
async function loadManagedClaim(db: Db, actor: Actor, claimId: string) {
	const [c] = await db
		.select({
			id: shiftClaim.id,
			shiftId: shiftClaim.shiftId,
			createdBy: shiftClaim.createdBy,
			claimedAt: shiftClaim.claimedAt,
			categoryId: task.categoryId
		})
		.from(shiftClaim)
		.innerJoin(shift, eq(shift.id, shiftClaim.shiftId))
		.innerJoin(task, eq(task.id, shift.taskId))
		.where(eq(shiftClaim.id, claimId));
	if (!c) throw new DomainError('claim_not_found');
	await assertManagesCategory(db, actor, c.categoryId);
	if (c.claimedAt) throw new DomainError('claim_used');
	return c;
}

/** Assign by hand, e.g. after the guest registered. Works after expiry too. */
export async function assignGuestClaim(db: Db, actor: Actor, claimId: string, input: unknown) {
	const { userId } = parse(AssignClaimInput, input);
	const c = await loadManagedClaim(db, actor, claimId);
	const member = await db.query.profile.findFirst({
		where: eq(profile.userId, userId),
		columns: { userId: true }
	});
	if (!member) throw new DomainError('user_not_found');
	await claimInto(db, c, userId);
}

/** Slip lost: a new code, valid for CLAIM_VALID_MONTHS again; the old one stops working. */
export async function reissueGuestCode(
	db: Db,
	actor: Actor,
	claimId: string
): Promise<{ code: string; expiresAt: Date }> {
	await loadManagedClaim(db, actor, claimId);
	const code = newClaimCode();
	const [row] = await db
		.update(shiftClaim)
		.set({ codeHash: hashCode(code), expiresAt: expiry() })
		.where(and(eq(shiftClaim.id, claimId), isNull(shiftClaim.claimedAt)))
		.returning({ expiresAt: shiftClaim.expiresAt });
	if (!row) throw new DomainError('claim_used');
	return { code, expiresAt: row.expiresAt };
}
