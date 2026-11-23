/*
 * News (slice 7). Admins write, every member reads. Drafts have no
 * publication date. The start page shows current posts: published and
 * not past `visibleUntil`; pinned ones always, then the newest few. The
 * archive shows everything published.
 */
import { and, desc, eq, gte, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { news, profile } from '@commonsdb/db/schema';
import type { RichTextDoc } from '@commonsdb/richtext';
import { DomainError } from '../errors.ts';
import { isAdmin, type Actor } from '../roles.ts';
import { parse } from '../validation.ts';
import { NEWS_ON_START, NewsInput } from './schema.ts';

export type NewsItem = {
	id: string;
	title: string;
	body: RichTextDoc;
	pinned: boolean;
	/** null = draft. */
	publishedAt: Date | null;
	/** 'YYYY-MM-DD', inclusive; null = no end. */
	visibleUntil: string | null;
	author: string | null;
	updatedAt: Date;
};

const view = {
	id: news.id,
	title: news.title,
	body: news.body,
	pinned: news.pinned,
	publishedAt: news.publishedAt,
	visibleUntil: news.visibleUntil,
	author: profile.displayName,
	updatedAt: news.updatedAt
};

const selectNews = (db: Db) =>
	db.select(view).from(news).leftJoin(profile, eq(profile.userId, news.createdBy));

const published = isNotNull(news.publishedAt);
const current: SQL = and(
	published,
	or(isNull(news.visibleUntil), gte(news.visibleUntil, sql`current_date`))
)!;

function assertEditor(actor: Actor) {
	if (!isAdmin(actor)) throw new DomainError('forbidden');
}

// ---- reading (every member) -------------------------------------------------

/** For the start page: every current pinned post, then the newest unpinned ones. */
export async function listCurrentNews(
	db: Db,
	{ limit = NEWS_ON_START }: { limit?: number } = {}
): Promise<NewsItem[]> {
	const [pinned, latest] = await Promise.all([
		selectNews(db)
			.where(and(current, eq(news.pinned, true)))
			.orderBy(desc(news.publishedAt)),
		selectNews(db)
			.where(and(current, eq(news.pinned, false)))
			.orderBy(desc(news.publishedAt))
			.limit(limit)
	]);
	return [...pinned, ...latest];
}

/** Everything published, newest first, expired posts included. */
export async function listNewsArchive(
	db: Db,
	{ limit = 50 }: { limit?: number } = {}
): Promise<NewsItem[]> {
	return selectNews(db).where(published).orderBy(desc(news.publishedAt)).limit(limit);
}

// ---- writing (admins) -------------------------------------------------------

/** Drafts first, then by publication date. */
export async function listNewsForAdmin(db: Db, actor: Actor): Promise<NewsItem[]> {
	assertEditor(actor);
	return selectNews(db).orderBy(
		sql`${news.publishedAt} is not null`,
		desc(news.publishedAt),
		desc(news.updatedAt)
	);
}

export async function getNewsForAdmin(db: Db, actor: Actor, id: string): Promise<NewsItem> {
	assertEditor(actor);
	const [row] = await selectNews(db).where(eq(news.id, id));
	if (!row) throw new DomainError('news_not_found');
	return row;
}

export async function createNews(db: Db, actor: Actor, input: unknown): Promise<string> {
	assertEditor(actor);
	const { published: publish, ...data } = parse(NewsInput, input);
	const [row] = await db
		.insert(news)
		.values({
			...data,
			publishedAt: publish ? new Date() : null,
			createdBy: actor.id,
			updatedBy: actor.id
		})
		.returning({ id: news.id });
	return row.id;
}

/** Publishing again keeps the first date; unticking makes it a draft again. */
export async function updateNews(db: Db, actor: Actor, id: string, input: unknown) {
	assertEditor(actor);
	const { published: publish, ...data } = parse(NewsInput, input);
	const existing = await db.query.news.findFirst({
		where: eq(news.id, id),
		columns: { publishedAt: true }
	});
	if (!existing) throw new DomainError('news_not_found');
	await db
		.update(news)
		.set({
			...data,
			publishedAt: publish ? (existing.publishedAt ?? new Date()) : null,
			updatedBy: actor.id,
			updatedAt: new Date()
		})
		.where(eq(news.id, id));
}

/** For good: news have no history worth keeping (unpublish to hide instead). */
export async function deleteNews(db: Db, actor: Actor, id: string) {
	assertEditor(actor);
	const gone = await db.delete(news).where(eq(news.id, id)).returning({ id: news.id });
	if (!gone.length) throw new DomainError('news_not_found');
}
