import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addDays, nextPeriods, whenKindOf, type SeriesRule, type SeriesTiming } from './rule.ts';

// 2026-11-16 is a Monday
const TODAY = '2026-11-16';

const periods = (
	rule: SeriesRule,
	over: Partial<SeriesTiming> = {},
	ctx: { today?: string; lastDone?: string | null; count?: number } = {}
) =>
	nextPeriods(
		{ rule, anchor: TODAY, until: null, minGapDays: 0, ...over },
		{ today: TODAY, lastDone: null, count: 3, ...ctx }
	);

/** Compact: 'start' for dates, 'start..end' for ranges. */
const days = (ps: ReturnType<typeof nextPeriods>) =>
	ps.map((p) => (p.endsOn ? `${p.startsOn}..${p.endsOn}` : p.startsOn));

describe('addDays', () => {
	test('crosses months, years and the DST change', () => {
		assert.equal(addDays('2026-10-24', 2), '2026-10-26');
		assert.equal(addDays('2026-12-31', 1), '2027-01-01');
		assert.equal(addDays('2028-03-01', -1), '2028-02-29');
	});
});

describe('whenKindOf', () => {
	test('windows are ranges, days are dates', () => {
		assert.equal(whenKindOf({ repeat: 'weekly', weekday: 2 }), 'date');
		assert.equal(whenKindOf({ repeat: 'weekly', fromWeekday: 0, toWeekday: 4 }), 'range');
		assert.equal(whenKindOf({ repeat: 'monthly', day: 1 }), 'date');
		assert.equal(whenKindOf({ repeat: 'monthly', fromDay: 1, toDay: 7 }), 'range');
		assert.equal(whenKindOf({ repeat: 'every_n_days', days: 3 }), 'range');
		assert.equal(whenKindOf({ repeat: 'manual' }), 'date');
	});
});

describe('weekly', () => {
	test('every Wednesday from today', () => {
		const ps = periods({ repeat: 'weekly', weekday: 2 });
		assert.deepEqual(days(ps), ['2026-11-18', '2026-11-25', '2026-12-02']);
		assert.deepEqual(
			ps.map((p) => p.key),
			['w:2026-11-16', 'w:2026-11-23', 'w:2026-11-30']
		);
	});

	test('a weekday already past this week starts next week', () => {
		assert.deepEqual(days(periods({ repeat: 'weekly', weekday: 0 }, {}, { today: '2026-11-17' })), [
			'2026-11-23',
			'2026-11-30',
			'2026-12-07'
		]);
	});

	test('today itself counts', () => {
		assert.equal(days(periods({ repeat: 'weekly', weekday: 0 }))[0], TODAY);
	});

	test('a later anchor: nothing before it', () => {
		const ps = periods({ repeat: 'weekly', weekday: 4 }, { anchor: '2026-12-01' });
		assert.deepEqual(days(ps), ['2026-12-04', '2026-12-11', '2026-12-18']);
	});

	test('biweekly keeps the anchor week’s parity', () => {
		// anchored three weeks ago: this week is off, next week is on
		const ps = periods({ repeat: 'biweekly', weekday: 1 }, { anchor: '2026-10-27' });
		assert.deepEqual(days(ps), ['2026-11-24', '2026-12-08', '2026-12-22']);
	});

	test('a weekday window; this week’s starts today', () => {
		const ps = periods(
			{ repeat: 'weekly', fromWeekday: 0, toWeekday: 2 },
			{},
			{ today: '2026-11-17' }
		);
		assert.deepEqual(days(ps), [
			'2026-11-17..2026-11-18',
			'2026-11-23..2026-11-25',
			'2026-11-30..2026-12-02'
		]);
	});

	test('a window that is over this week is skipped', () => {
		const ps = periods(
			{ repeat: 'weekly', fromWeekday: 0, toWeekday: 1 },
			{},
			{ today: '2026-11-19' }
		);
		assert.equal(days(ps)[0], '2026-11-23..2026-11-24');
	});
});

describe('monthly', () => {
	test('nth weekday: the first Saturday', () => {
		assert.deepEqual(days(periods({ repeat: 'monthly', nth: 1, weekday: 5 })), [
			'2026-12-05',
			'2027-01-02',
			'2027-02-06'
		]);
	});

	test('nth 5 means the last one, also in months with only four', () => {
		const ps = periods({ repeat: 'monthly', nth: 5, weekday: 4 }, {}, { count: 4 });
		// last Fridays: Nov 27, Dec 25, Jan 29, Feb 26
		assert.deepEqual(days(ps), ['2026-11-27', '2026-12-25', '2027-01-29', '2027-02-26']);
		assert.deepEqual(
			ps.map((p) => p.key),
			['m:2026-11', 'm:2026-12', 'm:2027-01', 'm:2027-02']
		);
	});

	test('day 31 is the last day in shorter months', () => {
		const ps = periods({ repeat: 'monthly', day: 31 }, {}, { count: 4 });
		assert.deepEqual(days(ps), ['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28']);
	});

	test('a day already past this month starts next month', () => {
		assert.equal(days(periods({ repeat: 'monthly', day: 1 }))[0], '2026-12-01');
	});

	test('a window of days; this month’s is clipped to today', () => {
		const ps = periods({ repeat: 'monthly', fromDay: 10, toDay: 20 });
		assert.deepEqual(days(ps), [
			'2026-11-16..2026-11-20',
			'2026-12-10..2026-12-20',
			'2027-01-10..2027-01-20'
		]);
	});

	test('a window past the month’s end is clamped', () => {
		const ps = periods(
			{ repeat: 'monthly', fromDay: 25, toDay: 31 },
			{ anchor: '2027-02-01' },
			{ count: 1 }
		);
		assert.deepEqual(days(ps), ['2027-02-25..2027-02-28']);
	});
});

describe('until', () => {
	test('nothing after it; a range is cut short', () => {
		assert.deepEqual(
			days(periods({ repeat: 'weekly', weekday: 2 }, { until: '2026-11-25' }, { count: 5 })),
			['2026-11-18', '2026-11-25']
		);
		assert.deepEqual(
			days(periods({ repeat: 'weekly', fromWeekday: 0, toWeekday: 4 }, { until: '2026-11-18' })),
			['2026-11-16..2026-11-18']
		);
	});

	test('an until in the past gives nothing', () => {
		assert.deepEqual(periods({ repeat: 'weekly', weekday: 2 }, { until: '2026-11-01' }), []);
	});
});

describe('minimum gap (ranges)', () => {
	test('pushes the start back after a late completion', () => {
		// done on Sunday; the next window may only start 3 days later
		const ps = periods(
			{ repeat: 'weekly', fromWeekday: 0, toWeekday: 4 },
			{ minGapDays: 3 },
			{ lastDone: '2026-11-15' }
		);
		assert.equal(days(ps)[0], '2026-11-18..2026-11-20');
	});

	test('skips a window the gap covers completely', () => {
		const ps = periods(
			{ repeat: 'weekly', fromWeekday: 0, toWeekday: 1 },
			{ minGapDays: 5 },
			{ lastDone: '2026-11-15' }
		);
		assert.equal(days(ps)[0], '2026-11-23..2026-11-24');
	});

	test('is ignored without a completion', () => {
		const ps = periods({ repeat: 'weekly', fromWeekday: 0, toWeekday: 1 }, { minGapDays: 5 });
		assert.equal(days(ps)[0], '2026-11-16..2026-11-17');
	});
});

describe('every n days', () => {
	test('before the first completion: from the anchor', () => {
		assert.deepEqual(days(periods({ repeat: 'every_n_days', days: 3 })), [
			'2026-11-16..2026-11-18',
			'2026-11-19..2026-11-21',
			'2026-11-22..2026-11-24'
		]);
	});

	test('after a completion: n days after it', () => {
		const ps = periods(
			{ repeat: 'every_n_days', days: 3 },
			{},
			{ lastDone: '2026-11-17', count: 1 }
		);
		assert.deepEqual(days(ps), ['2026-11-20..2026-11-22']);
		assert.equal(ps[0].key, 'd:2026-11-20');
	});

	test('a long-overdue completion starts today', () => {
		const ps = periods(
			{ repeat: 'every_n_days', days: 7 },
			{},
			{ lastDone: '2026-10-01', count: 1 }
		);
		assert.deepEqual(days(ps), ['2026-11-16..2026-11-22']);
	});

	test('one day: a single-day window', () => {
		assert.deepEqual(days(periods({ repeat: 'every_n_days', days: 1 }, {}, { count: 2 })), [
			'2026-11-16..2026-11-16',
			'2026-11-17..2026-11-17'
		]);
	});

	test('until cuts it short', () => {
		const ps = periods({ repeat: 'every_n_days', days: 3 }, { until: '2026-11-20' });
		assert.deepEqual(days(ps), ['2026-11-16..2026-11-18', '2026-11-19..2026-11-20']);
	});
});

test('manual has no periods', () => {
	assert.deepEqual(periods({ repeat: 'manual' }), []);
});
