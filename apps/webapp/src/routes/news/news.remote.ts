/*
 * News for members (slice 7): what the start page shows, and the archive.
 * Bodies leave as server-rendered HTML (toHtml), like wiki pages.
 */
import { query } from '$app/server';
import { listCurrentNews, listNewsArchive, type NewsItem } from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireActor } from '#lib/server/guards.ts';

export type NewsView = Omit<NewsItem, 'body'> & { html: string };

const withHtml = ({ body, ...item }: NewsItem): NewsView => ({
	...item,
	html: toHtml('news', body)
});

/** Pinned posts, then the newest few that haven't run out. */
export const currentNews = query(async () => {
	requireActor();
	return (await listCurrentNews(db)).map(withHtml);
});

export const newsArchive = query(async () => {
	requireActor();
	return (await listNewsArchive(db)).map(withHtml);
});
