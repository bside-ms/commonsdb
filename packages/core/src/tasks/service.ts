import {
	and,
	asc,
	desc,
	eq,
	exists,
	ilike,
	inArray,
	isNotNull,
	isNull,
	ne,
	or,
	sql,
	type SQL
} from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import {
	capability,
	category,
	profile,
	shift,
	superCategory,
	task,
	user,
	type ShiftStatus,
	type WhenKind
} from '@commonsdb/db/schema';
import { DomainError, ValidationError, type FieldErrors } from '../errors.ts';
import { assertSuperadmin, type Actor } from '../roles.ts';
import { parse } from '../validation.ts';
import { assertManagesCategory, canManageCategory, manageableCategories } from './policy.ts';
import { ReportInput, TaskFilter, TaskInput, type ShiftData, type TaskData } from './schema.ts';
import {
	byWindow,
	hhmm,
	isDoableNow,
	isTogether,
	localToday,
	parallelCount,
	type ShiftWindow
} from './shifts.ts';

// ---------------------------------------------------------------------------
// Read models. Services return these shapes, never raw rows, so routes only
// see what they're allowed to show (e.g. members never get assignee ids).
// ---------------------------------------------------------------------------

export type CategoryGroup = {
	id: string;
	name: string;
	categories: { id: string; name: string }[];
};

/** A shift's time window as read models hand it out ('HH:MM'). */
export type ShiftTimes = ShiftWindow;

/** What the member list needs to know about a task's shifts. */
export type ShiftSummary = {
	total: number;
	free: number;
	/** Most shifts running at the same time. */
	parallel: number;
	together: boolean;
	doableNow: boolean;
	/** Smallest and largest hours on offer, for "1–2 Std." */
	hoursTenths: { min: number; max: number };
	/** The actor's own shift on this task (at most one), until confirmed. */
	mine: { id: string; status: ShiftStatus; hoursTenths: number } | null;
};

export type TaskListItem = {
	id: string;
	title: string;
	urgent: boolean;
	place: string | null;
	whenKind: WhenKind;
	startsOn: string;
	endsOn: string | null;
	category: { id: string; name: string };
	shifts: ShiftSummary;
};

/**
 * One shift on the member detail page. Names of the people on a task are
 * visible to everyone who may open it: they meet at the shift anyway
 * (ROADMAP, slice 4). Notes only for the actor's own shift.
 */
export type MemberShift = ShiftTimes & {
	id: string;
	hoursTenths: number;
	status: ShiftStatus;
	mine: boolean;
	assigneeName: string | null;
	notes: { report: string | null; sentBack: string | null } | null;
};

export type TaskDetail = Omit<TaskListItem, 'shifts'> & {
	description: TaskData['description'];
	selfService: boolean;
	contact: string | null;
	bring: string | null;
	physicalDemands: string | null;
	summary: ShiftSummary;
	shifts: MemberShift[];
};

/** One shift as admins see it, in the list and on the edit page. */
export type AdminShift = ShiftTimes & {
	id: string;
	hoursTenths: number;
	status: ShiftStatus;
	assigneeName: string | null;
};

export type AdminTaskListItem = Omit<TaskListItem, 'shifts'> & {
	deleted: boolean;
	shifts: AdminShift[];
};

/** TaskData without the date/range narrowing and the shifts. */
type TaskFields = Omit<TaskData, 'whenKind' | 'endsOn' | 'shifts'> & {
	whenKind: WhenKind;
	endsOn: string | null;
};

/** The task as the edit form needs it, with every shift and who holds it. */
export type AdminTask = TaskFields & {
	id: string;
	deleted: boolean;
	shifts: AdminShift[];
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/** All categories, grouped by super category, in display order. */
export async function listCategories(db: Db): Promise<CategoryGroup[]> {
	const rows = await db
		.select({
			superId: superCategory.id,
			superName: superCategory.name,
			id: category.id,
			name: category.name
		})
		.from(category)
		.innerJoin(superCategory, eq(category.superCategoryId, superCategory.id))
		.orderBy(asc(superCategory.position), asc(superCategory.name), asc(category.position));

	const groups = new Map<string, CategoryGroup>();
	for (const r of rows) {
		const g = groups.get(r.superId) ?? { id: r.superId, name: r.superName, categories: [] };
		g.categories.push({ id: r.id, name: r.name });
		groups.set(r.superId, g);
	}
	return [...groups.values()];
}

/** The categories this actor may put tasks into (admin task form). */
export async function listManageableCategories(db: Db, actor: Actor) {
	const scope = await manageableCategories(db, actor);
	const all = await listCategories(db);
	if (scope === 'all') return all;
	return all
		.map((g) => ({ ...g, categories: g.categories.filter((c) => scope.includes(c.id)) }))
		.filter((g) => g.categories.length > 0);
}

// ---------------------------------------------------------------------------
// Shifts of a set of tasks
// ---------------------------------------------------------------------------

type ShiftRow = ShiftTimes & {
	id: string;
	taskId: string;
	hoursTenths: number;
	status: ShiftStatus;
	assigneeId: string | null;
	assigneeName: string | null;
	reportNote: string | null;
	sendBackNote: string | null;
};

/** Shifts per task id, in display order (by start time, untimed last). */
async function loadShifts(db: Db, taskIds: string[]): Promise<Map<string, ShiftRow[]>> {
	const byTask = new Map<string, ShiftRow[]>();
	if (taskIds.length === 0) return byTask;

	const rows = await db
		.select({
			id: shift.id,
			taskId: shift.taskId,
			startsTime: shift.startsTime,
			endsTime: shift.endsTime,
			endsNextDay: shift.endsNextDay,
			hoursTenths: shift.hoursTenths,
			status: shift.status,
			assigneeId: shift.assigneeId,
			assigneeName: profile.displayName,
			reportNote: shift.reportNote,
			sendBackNote: shift.sendBackNote
		})
		.from(shift)
		.leftJoin(profile, eq(profile.userId, shift.assigneeId))
		.where(inArray(shift.taskId, taskIds))
		.orderBy(asc(shift.position), asc(shift.createdAt));

	for (const r of rows) {
		const row = { ...r, startsTime: hhmm(r.startsTime), endsTime: hhmm(r.endsTime) };
		byTask.set(r.taskId, [...(byTask.get(r.taskId) ?? []), row]);
	}
	for (const list of byTask.values()) list.sort(byWindow); // stable: form order breaks ties
	return byTask;
}

const timesOf = (s: ShiftTimes): ShiftTimes => ({
	startsTime: s.startsTime,
	endsTime: s.endsTime,
	endsNextDay: s.endsNextDay
});

/** A member's own shift on a task, while it's still theirs to act on. */
const isMineActive = (s: ShiftRow, actor: Actor) =>
	s.assigneeId === actor.id && (s.status === 'taken' || s.status === 'reported');

function summarize(
	t: { whenKind: WhenKind; startsOn: string; endsOn: string | null },
	shifts: ShiftRow[],
	actor: Actor,
	today: string
): ShiftSummary {
	const free = shifts.filter((s) => s.status === 'open').length;
	const hours = shifts.map((s) => s.hoursTenths);
	const mine = shifts.find((s) => isMineActive(s, actor));
	return {
		total: shifts.length,
		free,
		parallel: parallelCount(shifts),
		together: isTogether(shifts),
		doableNow: isDoableNow(t, free, today),
		hoursTenths: { min: Math.min(...hours), max: Math.max(...hours) },
		mine: mine ? { id: mine.id, status: mine.status, hoursTenths: mine.hoursTenths } : null
	};
}

// ---------------------------------------------------------------------------
// Member side
// ---------------------------------------------------------------------------

const listColumns = {
	id: task.id,
	title: task.title,
	urgent: task.urgent,
	place: task.place,
	whenKind: task.whenKind,
	startsOn: task.startsOn,
	endsOn: task.endsOn,
	categoryId: category.id,
	categoryName: category.name
};

type ListRow = {
	id: string;
	title: string;
	urgent: boolean;
	place: string | null;
	whenKind: WhenKind;
	startsOn: string;
	endsOn: string | null;
	categoryId: string;
	categoryName: string;
};

const baseItem = (r: ListRow) => ({
	id: r.id,
	title: r.title,
	urgent: r.urgent,
	place: r.place,
	whenKind: r.whenKind,
	startsOn: r.startsOn,
	endsOn: r.endsOn,
	category: { id: r.categoryId, name: r.categoryName }
});

/** ilike pattern with the user's % and _ taken literally. */
const contains = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** A shift of this task matching `where` exists. */
const hasShift = (db: Db, where: SQL) =>
	exists(
		db
			.select({ one: sql`1` })
			.from(shift)
			.where(and(eq(shift.taskId, task.id), where))
	);

export type MemberListOptions = {
	/** Today's date where the space is; defaults to Berlin. Tests pass it. */
	today?: string;
};

/**
 * What a member sees: live tasks with a free shift, plus tasks where they
 * hold a shift until it's confirmed (then it lives on the account screen).
 * Urgent first, then by date.
 */
export async function listTasksForMember(
	db: Db,
	actor: Actor,
	filter: TaskFilter = {},
	{ today = localToday() }: MemberListOptions = {}
): Promise<TaskListItem[]> {
	const f = parse(TaskFilter, filter);
	const where: SQL[] = [
		isNull(task.deletedAt),
		or(
			hasShift(db, eq(shift.status, 'open')),
			hasShift(
				db,
				and(eq(shift.assigneeId, actor.id), inArray(shift.status, ['taken', 'reported']))!
			)
		)!
	];
	if (f.q) where.push(ilike(task.title, contains(f.q)));
	if (f.categoryId) where.push(eq(task.categoryId, f.categoryId));
	if (f.superCategoryId) where.push(eq(category.superCategoryId, f.superCategoryId));
	if (f.urgent) where.push(eq(task.urgent, true));

	const rows = await db
		.select(listColumns)
		.from(task)
		.innerJoin(category, eq(task.categoryId, category.id))
		.where(and(...where))
		.orderBy(desc(task.urgent), asc(task.startsOn), asc(task.title));

	const shifts = await loadShifts(
		db,
		rows.map((r) => r.id)
	);
	return rows
		.map((r) => ({ ...baseItem(r), shifts: summarize(r, shifts.get(r.id) ?? [], actor, today) }))
		.filter((t) => (!f.now || t.shifts.doableNow) && (!f.together || t.shifts.together));
}

/**
 * A member may open any live task with a free shift, or one where they
 * hold (or held) a shift.
 */
export async function getTaskForMember(
	db: Db,
	actor: Actor,
	taskId: string,
	{ today = localToday() }: MemberListOptions = {}
): Promise<TaskDetail> {
	const [r] = await db
		.select({
			...listColumns,
			description: task.description,
			selfService: task.selfService,
			contact: task.contact,
			bring: task.bring,
			physicalDemands: task.physicalDemands
		})
		.from(task)
		.innerJoin(category, eq(task.categoryId, category.id))
		.where(and(eq(task.id, taskId), isNull(task.deletedAt)))
		.limit(1);
	if (!r) throw new DomainError('task_not_found');

	const shifts = (await loadShifts(db, [taskId])).get(taskId) ?? [];
	const visible = shifts.some((s) => s.status === 'open' || s.assigneeId === actor.id);
	if (!visible) throw new DomainError('task_not_found');

	return {
		...baseItem(r),
		description: r.description,
		selfService: r.selfService,
		contact: r.contact,
		bring: r.bring,
		physicalDemands: r.physicalDemands,
		summary: summarize(r, shifts, actor, today),
		shifts: shifts.map((s) => {
			const mine = s.assigneeId === actor.id;
			return {
				id: s.id,
				...timesOf(s),
				hoursTenths: s.hoursTenths,
				status: s.status,
				mine,
				assigneeName: s.status === 'open' ? null : s.assigneeName,
				notes: mine ? { report: s.reportNote, sentBack: s.sendBackNote } : null
			};
		})
	};
}

/** Postgres unique violation, however the driver wraps it. */
function isUniqueViolation(e: unknown): boolean {
	for (let err = e; err && typeof err === 'object'; err = (err as { cause?: unknown }).cause) {
		if ((err as { code?: unknown }).code === '23505') return true;
	}
	return false;
}

/**
 * Take an open shift. One conditional UPDATE: if two people press the
 * button at once, exactly one row changes and the other gets an error.
 * One shift per member per task: checked first for a clear code, and
 * guaranteed by shift_one_per_member_idx.
 */
export async function takeShift(db: Db, actor: Actor, shiftId: string) {
	const target = await db.query.shift.findFirst({
		where: eq(shift.id, shiftId),
		columns: { taskId: true }
	});
	if (!target) throw new DomainError('shift_not_open');

	const other = await db.query.shift.findFirst({
		where: and(
			eq(shift.taskId, target.taskId),
			eq(shift.assigneeId, actor.id),
			ne(shift.id, shiftId)
		),
		columns: { id: true }
	});
	if (other) throw new DomainError('shift_one_per_member');

	const liveTasks = db.select({ id: task.id }).from(task).where(isNull(task.deletedAt));
	try {
		const [row] = await db
			.update(shift)
			.set({ status: 'taken', assigneeId: actor.id, takenAt: new Date() })
			.where(and(eq(shift.id, shiftId), eq(shift.status, 'open'), inArray(shift.taskId, liveTasks)))
			.returning({ id: shift.id });
		if (!row) throw new DomainError('shift_not_open');
	} catch (e) {
		if (isUniqueViolation(e)) throw new DomainError('shift_one_per_member');
		throw e;
	}
}

/** Give a taken shift back. The assignee, or an admin of its category. */
export async function releaseShift(db: Db, actor: Actor, shiftId: string) {
	const s = await db
		.select({ status: shift.status, assigneeId: shift.assigneeId, categoryId: task.categoryId })
		.from(shift)
		.innerJoin(task, eq(shift.taskId, task.id))
		.where(eq(shift.id, shiftId))
		.then((rows) => rows[0]);

	if (!s) throw new DomainError('shift_not_found');
	if (s.status !== 'taken') throw new DomainError('shift_not_taken');
	if (s.assigneeId !== actor.id && !(await canManageCategory(db, actor, s.categoryId))) {
		throw new DomainError('forbidden');
	}

	const [row] = await db
		.update(shift)
		.set({ status: 'open', assigneeId: null, takenAt: null })
		.where(and(eq(shift.id, shiftId), eq(shift.status, 'taken')))
		.returning({ id: shift.id });
	if (!row) throw new DomainError('shift_not_taken');
}

/**
 * The assignee reports a taken shift as done. One conditional UPDATE, so a
 * concurrent release or send-back can't be overwritten.
 */
export async function reportShift(db: Db, actor: Actor, shiftId: string, input: unknown) {
	const { note } = parse(ReportInput, input);
	const [row] = await db
		.update(shift)
		.set({ status: 'reported', reportedAt: new Date(), reportNote: note, sendBackNote: null })
		.where(and(eq(shift.id, shiftId), eq(shift.status, 'taken'), eq(shift.assigneeId, actor.id)))
		.returning({ id: shift.id });
	if (!row) throw new DomainError('shift_not_reportable');
}

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------

export type AdminTaskFilter = TaskFilter & { deleted?: boolean };

const toAdminShift = (s: ShiftRow): AdminShift => ({
	id: s.id,
	...timesOf(s),
	hoursTenths: s.hoursTenths,
	status: s.status,
	assigneeName: s.assigneeName
});

/** Tasks in the categories the admin manages; deleted ones on request. */
export async function listTasksForAdmin(
	db: Db,
	actor: Actor,
	filter: AdminTaskFilter = {}
): Promise<AdminTaskListItem[]> {
	const scope = await manageableCategories(db, actor);
	if (scope !== 'all' && scope.length === 0) return [];

	const f = parse(TaskFilter, { q: filter.q, categoryId: filter.categoryId });
	const where: SQL[] = [filter.deleted ? isNotNull(task.deletedAt) : isNull(task.deletedAt)];
	if (scope !== 'all') where.push(inArray(task.categoryId, scope));
	if (f.q) where.push(ilike(task.title, contains(f.q)));
	if (f.categoryId) where.push(eq(task.categoryId, f.categoryId));

	const rows = await db
		.select({ ...listColumns, deletedAt: task.deletedAt })
		.from(task)
		.innerJoin(category, eq(task.categoryId, category.id))
		.where(and(...where))
		.orderBy(desc(task.urgent), asc(task.startsOn), asc(task.title));

	const shifts = await loadShifts(
		db,
		rows.map((r) => r.id)
	);
	return rows.map((r) => ({
		...baseItem(r),
		deleted: r.deletedAt !== null,
		shifts: (shifts.get(r.id) ?? []).map(toAdminShift)
	}));
}

/** The full task for the edit form, deleted or not. */
export async function getTaskForAdmin(db: Db, actor: Actor, taskId: string): Promise<AdminTask> {
	const t = await db.query.task.findFirst({ where: eq(task.id, taskId) });
	if (!t) throw new DomainError('task_not_found');
	await assertManagesCategory(db, actor, t.categoryId);
	const shifts = (await loadShifts(db, [taskId])).get(taskId) ?? [];

	return {
		id: t.id,
		title: t.title,
		categoryId: t.categoryId,
		description: t.description,
		urgent: t.urgent,
		selfService: t.selfService,
		place: t.place,
		contact: t.contact,
		bring: t.bring,
		physicalDemands: t.physicalDemands,
		whenKind: t.whenKind,
		startsOn: t.startsOn,
		endsOn: t.endsOn,
		deleted: t.deletedAt !== null,
		shifts: shifts.map(toAdminShift)
	};
}

const taskColumns = ({ shifts: _, ...rest }: TaskFields & { shifts?: unknown }) => rest;

/** The columns a shift template sets (no id, no status). */
const shiftValues = (s: Omit<ShiftData, 'id'>, position: number) => ({
	position,
	startsTime: s.startsTime,
	endsTime: s.endsTime,
	endsNextDay: s.endsNextDay,
	hoursTenths: s.hoursTenths
});

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

async function insertTaskWithShifts(
	tx: Tx,
	actor: Actor,
	fields: TaskFields,
	shifts: Omit<ShiftData, 'id'>[]
): Promise<string> {
	const [t] = await tx
		.insert(task)
		.values({ ...taskColumns(fields), createdBy: actor.id })
		.returning({ id: task.id });
	await tx.insert(shift).values(shifts.map((s, i) => ({ taskId: t.id, ...shiftValues(s, i) })));
	return t.id;
}

/** New task with its shifts, in one transaction. Returns the task id. */
export async function createTask(db: Db, actor: Actor, input: unknown): Promise<string> {
	const data = parse(TaskInput, input);
	await assertManagesCategory(db, actor, data.categoryId);
	// ids only mean something when editing
	return db.transaction((tx) => insertTaskWithShifts(tx, actor, data, data.shifts));
}

/**
 * Edit a task and its shifts. Moving it to another category needs both
 * categories. Editing an occurrence of a series marks it as edited.
 * Shifts are matched by id:
 *
 * - new rows (no id) are added as open shifts
 * - open shifts may change freely or be removed
 * - taken or reported shifts keep their time window and can't be removed;
 *   their hours may still change (release them first to do more)
 * - confirmed shifts are credited: hours locked as well
 *
 * Shifts are read FOR UPDATE inside the transaction, so a member taking a
 * shift at the same moment waits and then sees the edited shift.
 */
export async function updateTask(db: Db, actor: Actor, taskId: string, input: unknown) {
	const data = parse(TaskInput, input);
	const current = await db.query.task.findFirst({
		where: eq(task.id, taskId),
		columns: { categoryId: true }
	});
	if (!current) throw new DomainError('task_not_found');
	await assertManagesCategory(db, actor, current.categoryId);
	if (data.categoryId !== current.categoryId) {
		await assertManagesCategory(db, actor, data.categoryId);
	}

	await db.transaction(async (tx) => {
		const existing = await tx
			.select({
				id: shift.id,
				status: shift.status,
				startsTime: shift.startsTime,
				endsTime: shift.endsTime,
				hoursTenths: shift.hoursTenths
			})
			.from(shift)
			.where(eq(shift.taskId, taskId))
			.for('update');
		const byId = new Map(existing.map((s) => [s.id, s]));

		const errors: FieldErrors = {};
		const seen = new Set<string>();
		data.shifts.forEach((s, i) => {
			if (s.id === null) return;
			const old = byId.get(s.id);
			if (!old || seen.has(s.id)) {
				errors[`shifts.${i}.id`] = 'shift_not_found';
				return;
			}
			seen.add(s.id);
			const retimed = hhmm(old.startsTime) !== s.startsTime || hhmm(old.endsTime) !== s.endsTime;
			if (old.status !== 'open' && retimed) {
				errors[`shifts.${i}.startsTime`] = 'shift_time_locked';
			}
			// confirmed hours are credited: changing them would leave the ledger wrong
			if (old.status === 'confirmed' && old.hoursTenths !== s.hoursTenths) {
				errors[`shifts.${i}.hours`] = 'shift_hours_locked';
			}
		});
		const removed = existing.filter((s) => !seen.has(s.id));
		if (removed.some((s) => s.status !== 'open')) errors.shifts = 'shift_remove_locked';
		if (Object.keys(errors).length > 0) throw new ValidationError(errors);

		await tx
			.update(task)
			// an occurrence edited on its own: series changes leave it alone from now on
			.set({ ...taskColumns(data), seriesEdited: sql`${task.seriesId} is not null` })
			.where(eq(task.id, taskId));
		if (removed.length > 0) {
			await tx.delete(shift).where(
				inArray(
					shift.id,
					removed.map((s) => s.id)
				)
			);
		}
		for (const [i, s] of data.shifts.entries()) {
			if (s.id === null) await tx.insert(shift).values({ taskId, ...shiftValues(s, i) });
			else await tx.update(shift).set(shiftValues(s, i)).where(eq(shift.id, s.id));
		}
	});
}

/** Copy of a task with the same shift templates, all open. Returns the new id. */
export async function duplicateTask(db: Db, actor: Actor, taskId: string): Promise<string> {
	const { id: _, deleted: __, shifts, ...source } = await getTaskForAdmin(db, actor, taskId);
	return db.transaction((tx) =>
		insertTaskWithShifts(
			tx,
			actor,
			source,
			shifts.map((s) => ({
				startsTime: s.startsTime,
				endsTime: s.endsTime,
				endsNextDay: s.endsNextDay,
				hoursTenths: s.hoursTenths
			}))
		)
	);
}

async function setDeleted(db: Db, actor: Actor, taskId: string, deletedAt: Date | null) {
	const t = await db.query.task.findFirst({
		where: eq(task.id, taskId),
		columns: { categoryId: true }
	});
	if (!t) throw new DomainError('task_not_found');
	await assertManagesCategory(db, actor, t.categoryId);
	await db.update(task).set({ deletedAt }).where(eq(task.id, taskId));
}

/** Soft delete: hidden from members, restorable. A taken shift stays as it is. */
export const deleteTask = (db: Db, actor: Actor, taskId: string) =>
	setDeleted(db, actor, taskId, new Date());

export const restoreTask = (db: Db, actor: Actor, taskId: string) =>
	setDeleted(db, actor, taskId, null);

// ---------------------------------------------------------------------------
// Capabilities (superadmin)
// ---------------------------------------------------------------------------

/** Admins and the category ids each one manages. */
export async function listAdminCapabilities(db: Db, actor: Actor) {
	assertSuperadmin(actor);
	const rows = await db
		.select({
			id: user.id,
			name: sql<string>`coalesce(
            ${profile.displayName},
            ${user.name}
            )`,
			categoryId: capability.categoryId
		})
		.from(user)
		.leftJoin(profile, eq(profile.userId, user.id))
		.leftJoin(capability, eq(capability.userId, user.id))
		.where(eq(user.platformRole, 'admin'))
		.orderBy(asc(sql`2`));

	// one row per (admin, category) → one entry per admin
	const admins = new Map<string, { id: string; name: string; categoryIds: string[] }>();
	for (const r of rows) {
		const a = admins.get(r.id) ?? { id: r.id, name: r.name, categoryIds: [] };
		if (r.categoryId) a.categoryIds.push(r.categoryId);
		admins.set(r.id, a);
	}
	return [...admins.values()];
}

/** Replace an admin's categories in one go (the form posts the full set). */
export async function setCapabilities(db: Db, actor: Actor, userId: string, categoryIds: string[]) {
	assertSuperadmin(actor);
	const unique = [...new Set(categoryIds)];
	await db.transaction(async (tx) => {
		await tx.delete(capability).where(eq(capability.userId, userId));
		if (unique.length > 0) {
			await tx.insert(capability).values(unique.map((categoryId) => ({ userId, categoryId })));
		}
	});
}
