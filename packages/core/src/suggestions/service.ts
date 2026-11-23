/*
 * Suggestions (slice 7). Members report something; admins whose
 * categories it concerns convert it into a task or decline it.
 * Uncategorised suggestions go to every admin. Superadmins see all.
 */
import { and, count, desc, eq, inArray, isNull, or, type SQL } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { category, profile, suggestion, type SuggestionStatus } from '@commonsdb/db/schema';
import { DomainError, ValidationError } from '../errors.ts';
import { isAdmin, type Actor } from '../roles.ts';
import { parse } from '../validation.ts';
import { assertUsableImage } from '../tasks/images.ts';
import { manageableCategories, type CategoryScope } from '../tasks/policy.ts';
import { createTask } from '../tasks/service.ts';
import { RejectSuggestionInput, SuggestionInput } from './schema.ts';

export type SuggestionView = {
	id: string;
	title: string;
	body: string | null;
	place: string | null;
	categoryId: string | null;
	categoryName: string | null;
	imageId: string | null;
	status: SuggestionStatus;
	taskId: string | null;
	rejectionNote: string | null;
	author: string | null;
	createdAt: Date;
	handledAt: Date | null;
};

const view = {
	id: suggestion.id,
	title: suggestion.title,
	body: suggestion.body,
	place: suggestion.place,
	categoryId: suggestion.categoryId,
	categoryName: category.name,
	imageId: suggestion.imageId,
	status: suggestion.status,
	taskId: suggestion.taskId,
	rejectionNote: suggestion.rejectionNote,
	author: profile.displayName,
	createdAt: suggestion.createdAt,
	handledAt: suggestion.handledAt
};

const selectViews = (db: Db) =>
	db
		.select(view)
		.from(suggestion)
		.leftJoin(category, eq(category.id, suggestion.categoryId))
		.leftJoin(profile, eq(profile.userId, suggestion.createdBy));

/** Uncategorised suggestions belong to every admin. */
function inScope(scope: CategoryScope): SQL | undefined {
	if (scope === 'all') return undefined;
	const none = isNull(suggestion.categoryId);
	return scope.length ? or(none, inArray(suggestion.categoryId, scope)) : none;
}

async function adminScope(db: Db, actor: Actor) {
	if (!isAdmin(actor)) throw new DomainError('forbidden');
	return manageableCategories(db, actor);
}

/** One suggestion the admin may handle; out of scope reads as not found. */
async function handleable(db: Db, actor: Actor, id: string): Promise<SuggestionView> {
	const scope = await adminScope(db, actor);
	const [row] = await selectViews(db).where(and(eq(suggestion.id, id), inScope(scope)));
	if (!row) throw new DomainError('suggestion_not_found');
	return row;
}

// ---- members ----------------------------------------------------------------

export async function createSuggestion(db: Db, actor: Actor, input: unknown): Promise<string> {
	const data = parse(SuggestionInput, input);
	if (data.categoryId) {
		const found = await db.query.category.findFirst({
			where: eq(category.id, data.categoryId),
			columns: { id: true }
		});
		if (!found) throw new ValidationError({ categoryId: 'category_not_found' });
	}
	await assertUsableImage(db, actor, data.imageId);
	const [row] = await db
		.insert(suggestion)
		.values({ ...data, createdBy: actor.id })
		.returning({ id: suggestion.id });
	return row.id;
}

/** The actor's own suggestions, newest first. */
export async function listOwnSuggestions(db: Db, actor: Actor): Promise<SuggestionView[]> {
	return selectViews(db)
		.where(eq(suggestion.createdBy, actor.id))
		.orderBy(desc(suggestion.createdAt));
}

// ---- admins -----------------------------------------------------------------

export async function listSuggestionsForAdmin(
	db: Db,
	actor: Actor,
	{ status = 'open' }: { status?: SuggestionStatus } = {}
): Promise<SuggestionView[]> {
	const scope = await adminScope(db, actor);
	return selectViews(db)
		.where(and(eq(suggestion.status, status), inScope(scope)))
		.orderBy(status === 'open' ? suggestion.createdAt : desc(suggestion.handledAt));
}

export async function countOpenSuggestions(db: Db, actor: Actor): Promise<number> {
	if (!isAdmin(actor)) return 0;
	const scope = await manageableCategories(db, actor);
	const [row] = await db
		.select({ n: count() })
		.from(suggestion)
		.where(and(eq(suggestion.status, 'open'), inScope(scope)));
	return row.n;
}

export const getSuggestionForAdmin = handleable;

/**
 * Create the task (core's TaskInput, the admin's possibly edited form)
 * and mark the suggestion converted, in one transaction. Two admins at
 * once: the second finds it handled and its task is rolled back.
 */
export async function convertSuggestion(
	db: Db,
	actor: Actor,
	id: string,
	taskInput: unknown
): Promise<string> {
	const s = await handleable(db, actor, id);
	if (s.status !== 'open') throw new DomainError('suggestion_already_handled');
	return createTask(db, actor, taskInput, {
		keepImageId: s.imageId,
		within: async (tx, taskId) => {
			const done = await tx
				.update(suggestion)
				.set({ status: 'converted', taskId, handledBy: actor.id, handledAt: new Date() })
				.where(and(eq(suggestion.id, id), eq(suggestion.status, 'open')))
				.returning({ id: suggestion.id });
			if (!done.length) throw new DomainError('suggestion_already_handled');
		}
	});
}

export async function rejectSuggestion(db: Db, actor: Actor, id: string, input: unknown) {
	const { note } = parse(RejectSuggestionInput, input);
	await handleable(db, actor, id);
	const done = await db
		.update(suggestion)
		.set({ status: 'rejected', rejectionNote: note, handledBy: actor.id, handledAt: new Date() })
		.where(and(eq(suggestion.id, id), eq(suggestion.status, 'open')))
		.returning({ id: suggestion.id });
	if (!done.length) throw new DomainError('suggestion_already_handled');
}
