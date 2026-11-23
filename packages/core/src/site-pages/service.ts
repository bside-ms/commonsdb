/*
 * Runtime-editable pages (slice 7): every member reads, superadmins
 * write. One row per slug, created on first save. Uses the wiki's rich
 * text profile: these pages are longer and can use headings.
 */
import { eq } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { profile, sitePage } from '@commonsdb/db/schema';
import type { RichTextDoc } from '@commonsdb/richtext';
import { DomainError } from '../errors.ts';
import { assertSuperadmin, isSuperadmin, type Actor } from '../roles.ts';
import { parse } from '../validation.ts';
import { SITE_PAGES, SitePageInput, type SitePageSlug } from './schema.ts';

export type SitePageView = {
	slug: SitePageSlug;
	/** null: never written, or emptied. */
	content: RichTextDoc | null;
	updatedAt: Date | null;
	updatedBy: string | null;
	canEdit: boolean;
};

function known(slug: string): SitePageSlug {
	const found = SITE_PAGES.find((s) => s === slug);
	if (!found) throw new DomainError('site_page_not_found');
	return found;
}

export async function getSitePage(db: Db, actor: Actor, slug: string): Promise<SitePageView> {
	const s = known(slug);
	const [row] = await db
		.select({
			body: sitePage.body,
			updatedAt: sitePage.updatedAt,
			updatedBy: profile.displayName
		})
		.from(sitePage)
		.leftJoin(profile, eq(profile.userId, sitePage.updatedBy))
		.where(eq(sitePage.slug, s));
	return {
		slug: s,
		content: row?.body ?? null,
		updatedAt: row?.updatedAt ?? null,
		updatedBy: row?.updatedBy ?? null,
		canEdit: isSuperadmin(actor)
	};
}

export async function saveSitePage(db: Db, actor: Actor, slug: string, input: unknown) {
	assertSuperadmin(actor);
	const s = known(slug);
	const { content } = parse(SitePageInput, input);
	const values = { body: content, updatedBy: actor.id, updatedAt: new Date() };
	await db
		.insert(sitePage)
		.values({ slug: s, ...values })
		.onConflictDoUpdate({ target: sitePage.slug, set: values });
}
