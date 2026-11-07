import {and, eq} from 'drizzle-orm';
import type {Db} from '@commonsdb/db';
import {capability} from '@commonsdb/db/schema';
import {DomainError} from '../errors.ts';
import {isAdmin, isSuperadmin, type Actor} from '../roles.ts';

/** 'all' for superadmins, otherwise the category ids from capabilities. */
export type CategoryScope = 'all' | string[];

export async function manageableCategories(db: Db, actor: Actor): Promise<CategoryScope> {
    if (isSuperadmin(actor)) return 'all';
    if (!isAdmin(actor)) return [];
    const rows = await db
        .select({id: capability.categoryId})
        .from(capability)
        .where(eq(capability.userId, actor.id));
    return rows.map((r) => r.id);
}

export async function canManageCategory(db: Db, actor: Actor, categoryId: string) {
    if (isSuperadmin(actor)) return true;
    if (!isAdmin(actor)) return false;
    const row = await db.query.capability.findFirst({
        where: and(eq(capability.userId, actor.id), eq(capability.categoryId, categoryId)),
        columns: {userId: true}
    });
    return row !== undefined;
}

/** Throws 'forbidden' unless the actor manages that category. */
export async function assertManagesCategory(db: Db, actor: Actor, categoryId: string) {
    if (!(await canManageCategory(db, actor, categoryId))) throw new DomainError('forbidden');
}

export function assertSuperadmin(actor: Actor) {
    if (!isSuperadmin(actor)) throw new DomainError('forbidden');
}
