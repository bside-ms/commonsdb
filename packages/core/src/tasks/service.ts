import {
    and,
    asc,
    desc,
    eq,
    ilike,
    inArray,
    isNotNull,
    isNull,
    or,
    sql,
    type SQL
} from 'drizzle-orm';
import type {Db} from '@commonsdb/db';
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
import {DomainError} from '../errors.ts';
import type {Actor} from '../roles.ts';
import {parse} from '../validation.ts';
import {
    assertManagesCategory,
    assertSuperadmin,
    canManageCategory,
    manageableCategories
} from './policy.ts';
import {TaskFilter, TaskInput, type TaskData} from './schema.ts';

// ---------------------------------------------------------------------------
// Read models. Services return these shapes, never raw rows, so routes only
// see what they're allowed to show (e.g. members never get assignee ids).
// ---------------------------------------------------------------------------

export type CategoryGroup = {
    id: string;
    name: string;
    categories: { id: string; name: string }[];
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
    shift: { id: string; hoursTenths: number; status: ShiftStatus; mine: boolean };
};

export type TaskDetail = TaskListItem & {
    description: TaskData['description'];
    selfService: boolean;
    contact: string | null;
    bring: string | null;
    physicalDemands: string | null;
};

export type AdminTaskListItem = Omit<TaskListItem, 'shift'> & {
    deleted: boolean;
    shift: { id: string; hoursTenths: number; status: ShiftStatus; assigneeName: string | null };
};

/** TaskData without the date/range narrowing: what comes back from the DB. */
type TaskFields = Omit<TaskData, 'whenKind' | 'endsOn'> & {
    whenKind: WhenKind;
    endsOn: string | null;
};

export type AdminTask = TaskFields & { id: string; deleted: boolean; shiftId: string };

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
        const g = groups.get(r.superId) ?? {id: r.superId, name: r.superName, categories: []};
        g.categories.push({id: r.id, name: r.name});
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
        .map((g) => ({...g, categories: g.categories.filter((c) => scope.includes(c.id))}))
        .filter((g) => g.categories.length > 0);
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
    categoryName: category.name,
    shiftId: shift.id,
    hoursTenths: shift.hoursTenths,
    status: shift.status,
    assigneeId: shift.assigneeId
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
    shiftId: string;
    hoursTenths: number;
    status: ShiftStatus;
    assigneeId: string | null;
};

function toListItem(r: ListRow, actor: Actor): TaskListItem {
    return {
        id: r.id,
        title: r.title,
        urgent: r.urgent,
        place: r.place,
        whenKind: r.whenKind,
        startsOn: r.startsOn,
        endsOn: r.endsOn,
        category: {id: r.categoryId, name: r.categoryName},
        shift: {
            id: r.shiftId,
            hoursTenths: r.hoursTenths,
            status: r.status,
            mine: r.assigneeId === actor.id
        }
    };
}

/** ilike pattern with the user's % and _ taken literally. */
const contains = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * What a member sees: live tasks that are still open, plus their own.
 * Urgent first, then by date.
 */
export async function listTasksForMember(
    db: Db,
    actor: Actor,
    filter: TaskFilter = {}
): Promise<TaskListItem[]> {
    const f = parse(TaskFilter, filter);
    const where: SQL[] = [
        isNull(task.deletedAt),
        or(eq(shift.status, 'open'), eq(shift.assigneeId, actor.id))!
    ];
    if (f.q) where.push(ilike(task.title, contains(f.q)));
    if (f.categoryId) where.push(eq(task.categoryId, f.categoryId));

    const rows = await db
        .select(listColumns)
        .from(task)
        .innerJoin(category, eq(task.categoryId, category.id))
        .innerJoin(shift, eq(shift.taskId, task.id))
        .where(and(...where))
        .orderBy(desc(task.urgent), asc(task.startsOn), asc(task.title));

    return rows.map((r) => toListItem(r, actor));
}

/** A member may open any live task that is open or theirs. */
export async function getTaskForMember(db: Db, actor: Actor, taskId: string): Promise<TaskDetail> {
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
        .innerJoin(shift, eq(shift.taskId, task.id))
        .where(and(eq(task.id, taskId), isNull(task.deletedAt)))
        .limit(1);

    if (!r) throw new DomainError('task_not_found');
    if (r.status !== 'open' && r.assigneeId !== actor.id) throw new DomainError('task_not_found');

    return {
        ...toListItem(r, actor),
        description: r.description,
        selfService: r.selfService,
        contact: r.contact,
        bring: r.bring,
        physicalDemands: r.physicalDemands
    };
}

/**
 * Take an open shift. One conditional UPDATE: if two people press the
 * button at once, exactly one row changes and the other gets an error.
 */
export async function takeShift(db: Db, actor: Actor, shiftId: string) {
    const liveTasks = db.select({id: task.id}).from(task).where(isNull(task.deletedAt));
    const [row] = await db
        .update(shift)
        .set({status: 'taken', assigneeId: actor.id, takenAt: new Date()})
        .where(and(eq(shift.id, shiftId), eq(shift.status, 'open'), inArray(shift.taskId, liveTasks)))
        .returning({id: shift.id});
    if (!row) throw new DomainError('shift_not_open');
}

/** Give a taken shift back. The assignee, or an admin of its category. */
export async function releaseShift(db: Db, actor: Actor, shiftId: string) {
    const s = await db
        .select({status: shift.status, assigneeId: shift.assigneeId, categoryId: task.categoryId})
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
        .set({status: 'open', assigneeId: null, takenAt: null})
        .where(and(eq(shift.id, shiftId), eq(shift.status, 'taken')))
        .returning({id: shift.id});
    if (!row) throw new DomainError('shift_not_taken');
}

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------

export type AdminTaskFilter = TaskFilter & { deleted?: boolean };

/** Tasks in the categories the admin manages; deleted ones on request. */
export async function listTasksForAdmin(
    db: Db,
    actor: Actor,
    filter: AdminTaskFilter = {}
): Promise<AdminTaskListItem[]> {
    const scope = await manageableCategories(db, actor);
    if (scope !== 'all' && scope.length === 0) return [];

    const f = parse(TaskFilter, {q: filter.q, categoryId: filter.categoryId});
    const where: SQL[] = [filter.deleted ? isNotNull(task.deletedAt) : isNull(task.deletedAt)];
    if (scope !== 'all') where.push(inArray(task.categoryId, scope));
    if (f.q) where.push(ilike(task.title, contains(f.q)));
    if (f.categoryId) where.push(eq(task.categoryId, f.categoryId));

    const rows = await db
        .select({
            ...listColumns,
            deletedAt: task.deletedAt,
            assigneeName: profile.displayName
        })
        .from(task)
        .innerJoin(category, eq(task.categoryId, category.id))
        .innerJoin(shift, eq(shift.taskId, task.id))
        .leftJoin(profile, eq(profile.userId, shift.assigneeId))
        .where(and(...where))
        .orderBy(desc(task.urgent), asc(task.startsOn), asc(task.title));

    return rows.map((r) => ({
        id: r.id,
        title: r.title,
        urgent: r.urgent,
        place: r.place,
        whenKind: r.whenKind,
        startsOn: r.startsOn,
        endsOn: r.endsOn,
        category: {id: r.categoryId, name: r.categoryName},
        deleted: r.deletedAt !== null,
        shift: {
            id: r.shiftId,
            hoursTenths: r.hoursTenths,
            status: r.status,
            assigneeName: r.assigneeName
        }
    }));
}

/** The full task for the edit form, deleted or not. */
export async function getTaskForAdmin(db: Db, actor: Actor, taskId: string): Promise<AdminTask> {
    const t = await db.query.task.findFirst({
        where: eq(task.id, taskId),
        with: {shifts: {columns: {id: true, hoursTenths: true}, limit: 1}}
    });
    if (!t || t.shifts.length === 0) throw new DomainError('task_not_found');
    await assertManagesCategory(db, actor, t.categoryId);

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
        hoursTenths: t.shifts[0].hoursTenths,
        shiftId: t.shifts[0].id,
        deleted: t.deletedAt !== null
    };
}

const taskColumns = ({hoursTenths: _, ...rest}: TaskFields) => rest;

/** New task with its one shift, in one transaction. Returns the task id. */
export async function createTask(db: Db, actor: Actor, input: unknown): Promise<string> {
    const data = parse(TaskInput, input);
    await assertManagesCategory(db, actor, data.categoryId);

    return db.transaction(async (tx) => {
        const [t] = await tx
            .insert(task)
            .values({...taskColumns(data), createdBy: actor.id})
            .returning({id: task.id});
        await tx.insert(shift).values({taskId: t.id, hoursTenths: data.hoursTenths});
        return t.id;
    });
}

/**
 * Edit a task. Moving it to another category needs both categories.
 * Hours may change while the shift is taken (nothing is credited until slice 3).
 */
export async function updateTask(db: Db, actor: Actor, taskId: string, input: unknown) {
    const data = parse(TaskInput, input);
    const current = await db.query.task.findFirst({
        where: eq(task.id, taskId),
        columns: {categoryId: true}
    });
    if (!current) throw new DomainError('task_not_found');
    await assertManagesCategory(db, actor, current.categoryId);
    if (data.categoryId !== current.categoryId) {
        await assertManagesCategory(db, actor, data.categoryId);
    }

    await db.transaction(async (tx) => {
        await tx.update(task).set(taskColumns(data)).where(eq(task.id, taskId));
        await tx.update(shift).set({hoursTenths: data.hoursTenths}).where(eq(shift.taskId, taskId));
    });
}

/** Copy of a task with a fresh, open shift. Returns the new id. */
export async function duplicateTask(db: Db, actor: Actor, taskId: string): Promise<string> {
    const {id: _, deleted: __, shiftId: ___, ...source} = await getTaskForAdmin(db, actor, taskId);
    return db.transaction(async (tx) => {
        const [t] = await tx
            .insert(task)
            .values({...taskColumns(source), createdBy: actor.id})
            .returning({id: task.id});
        await tx.insert(shift).values({taskId: t.id, hoursTenths: source.hoursTenths});
        return t.id;
    });
}

async function setDeleted(db: Db, actor: Actor, taskId: string, deletedAt: Date | null) {
    const t = await db.query.task.findFirst({
        where: eq(task.id, taskId),
        columns: {categoryId: true}
    });
    if (!t) throw new DomainError('task_not_found');
    await assertManagesCategory(db, actor, t.categoryId);
    await db.update(task).set({deletedAt}).where(eq(task.id, taskId));
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
        const a = admins.get(r.id) ?? {id: r.id, name: r.name, categoryIds: []};
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
            await tx.insert(capability).values(unique.map((categoryId) => ({userId, categoryId})));
        }
    });
}
