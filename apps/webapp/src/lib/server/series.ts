import { topUpSeriesDaily } from '@commonsdb/core';
import { db } from './services.ts';

/**
 * Keep recurring series topped up: once per day and process, on the first
 * task-list load (ROADMAP, slice 5). A failure must not break the list
 * that triggered it, so it is logged and retried on the next load.
 */
export async function topUpSeries() {
	try {
		await topUpSeriesDaily(db);
	} catch (e) {
		console.error('series top-up failed', e);
	}
}
