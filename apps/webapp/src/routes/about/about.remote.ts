/*
 * The "About" page (slice 7). Every member reads; superadmins edit it in
 * place (core checks too). Content arrives as TipTap JSON and leaves as
 * server-rendered HTML, like wiki pages.
 */
import { redirect } from '@sveltejs/kit';
import { form, query } from '$app/server';
import * as v from 'valibot';
import { getSitePage, saveSitePage } from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireActor, requireSuperadmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

export const aboutPage = query(async () => {
	const page = await getSitePage(db, requireActor(), 'about').catch(toHttpError);
	return { ...page, html: toHtml('wiki', page.content) };
});

/** The same, for the editor: superadmins only, so the edit URL answers 403 to others. */
export const aboutForEdit = query(async () => {
	const page = await getSitePage(db, requireSuperadmin(), 'about').catch(toHttpError);
	return { ...page, html: toHtml('wiki', page.content) };
});

export const saveAbout = form(v.object({ content: v.optional(v.string()) }), async (input) => {
	await saveSitePage(db, requireSuperadmin(), 'about', input).catch(toFormIssues);
	redirect(303, '/about');
});
