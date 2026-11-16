/*
 * Recurring series as remote functions (slice 5). Like tasks.remote.ts:
 * every function starts with requireAdmin(); validation and category
 * scope live in core.
 */
import { error, redirect } from '@sveltejs/kit';
import { form, query } from '$app/server';
import * as v from 'valibot';
import {
	addOccurrence,
	createSeries,
	deleteSeries,
	endSeries,
	getSeriesForAdmin,
	listSeriesForAdmin,
	pauseSeries,
	previewSeries,
	resumeSeries,
	updateSeries
} from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { topUpSeries } from '#lib/server/series.ts';
import { requireAdmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';
import type { TemplateFormData } from '../tasks/template.ts';

const Id = v.pipe(v.string(), v.uuid());

// ---- reads ----------------------------------------------------------------

export const adminSeriesList = query(async () => {
	const actor = requireAdmin();
	await topUpSeries();
	return listSeriesForAdmin(db, actor).catch(toHttpError);
});

/** One series for the edit page, with its description pre-rendered. */
export const adminSeries = query(Id, async (id) => {
	const series = await getSeriesForAdmin(db, requireAdmin(), id).catch(toHttpError);
	return { ...series, descriptionHtml: toHtml('description', series.description) };
});

/**
 * The next dates the form's current rule gives. Called while typing; an
 * incomplete rule gives an empty list, never an error.
 */
export const seriesPreview = query(
	v.object({ seriesId: v.optional(v.string()), rule: v.record(v.string(), v.unknown()) }),
	async ({ seriesId, rule }) =>
		previewSeries(db, requireAdmin(), rule, {
			seriesId: v.is(Id, seriesId) ? seriesId : undefined
		}).catch(() => [])
);

// ---- writes ---------------------------------------------------------------

/** The rule's fields as the form posts them (strings; core parses). */
export type SeriesRuleFormData = {
	repeat: string;
	whenKind?: string;
	monthMode?: string;
	weekday?: string;
	fromWeekday?: string;
	toWeekday?: string;
	nth?: string;
	day?: string;
	fromDay?: string;
	toDay?: string;
	days?: string;
	anchor: string;
	until?: string;
	minGapDays?: string;
	lookahead?: string;
};

/** Everything the series form posts. 'unchecked': core's SeriesInput validates. */
export type SeriesFormData = TemplateFormData & SeriesRuleFormData & { id?: string };

/** Create, then open it (a manual series needs its first dates); update, back to the list. */
export const saveSeries = form('unchecked', async ({ id, ...input }: SeriesFormData) => {
	const actor = requireAdmin();
	if (id !== undefined && !v.is(Id, id)) error(400, 'series_not_found');
	let target = '/admin/series';
	try {
		if (id) await updateSeries(db, actor, id, input);
		else target = `/admin/series/${await createSeries(db, actor, input)}`;
	} catch (e) {
		toFormIssues(e);
	}
	redirect(303, target);
});

const ById = v.object({ id: Id });

export const pause = form(ById, async ({ id }) => {
	await pauseSeries(db, requireAdmin(), id).catch(toFormIssues);
	return { done: true };
});

export const resume = form(ById, async ({ id }) => {
	await resumeSeries(db, requireAdmin(), id).catch(toFormIssues);
	return { done: true };
});

export const remove = form(ById, async ({ id }) => {
	await deleteSeries(db, requireAdmin(), id).catch(toFormIssues);
	redirect(303, '/admin/series');
});

export const end = form(
	v.object({ id: Id, until: v.optional(v.string()) }),
	async ({ id, until }) => {
		await endSeries(db, requireAdmin(), id, { until }).catch(toFormIssues);
		return { until };
	}
);

export const addDate = form(
	v.object({ id: Id, startsOn: v.optional(v.string()), endsOn: v.optional(v.string()) }),
	async ({ id, startsOn, endsOn }) => {
		await addOccurrence(db, requireAdmin(), id, { startsOn, endsOn }).catch(toFormIssues);
		return { done: true };
	}
);
