import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	byWindow,
	endsNextDay,
	isDoableNow,
	isTogether,
	localToday,
	parallelCount,
	shiftsOverlap,
	type ShiftWindow
} from './shifts.ts';

const w = (startsTime: string | null, endsTime: string | null): ShiftWindow => ({
	startsTime,
	endsTime,
	endsNextDay: startsTime !== null && endsTime !== null && endsNextDay(startsTime, endsTime)
});
const any = w(null, null);

describe('shiftsOverlap', () => {
	test('touching windows do not overlap', () => {
		assert.equal(shiftsOverlap(w('10:00', '12:00'), w('12:00', '14:00')), false);
		assert.equal(shiftsOverlap(w('10:00', '12:00'), w('11:30', '14:00')), true);
	});

	test('no window overlaps everything', () => {
		assert.equal(shiftsOverlap(any, w('10:00', '12:00')), true);
		assert.equal(shiftsOverlap(any, any), true);
	});

	test('windows past midnight', () => {
		assert.equal(shiftsOverlap(w('22:00', '02:00'), w('23:00', '23:30')), true);
		assert.equal(shiftsOverlap(w('22:00', '02:00'), w('18:00', '22:00')), false);
		assert.equal(shiftsOverlap(w('22:00', '02:00'), w('21:00', '01:00')), true);
	});

	test('reads Postgres seconds', () => {
		assert.equal(shiftsOverlap(w('10:00:00', '12:00:00'), w('11:00', '13:00')), true);
	});
});

describe('endsNextDay', () => {
	test('end at or before start means the next day', () => {
		assert.equal(endsNextDay('22:00', '02:00'), true);
		assert.equal(endsNextDay('08:00', '08:00'), true, 'a full 24 h');
		assert.equal(endsNextDay('08:00', '16:00'), false);
	});
});

describe('parallelCount / isTogether', () => {
	test('one shift is never together', () => {
		assert.equal(parallelCount([w('10:00', '12:00')]), 1);
		assert.equal(isTogether([any]), false);
		assert.equal(parallelCount([]), 0);
	});

	test('back-to-back shifts are not together', () => {
		const shifts = [w('10:00', '12:00'), w('12:00', '14:00'), w('14:00', '16:00')];
		assert.equal(parallelCount(shifts), 1);
		assert.equal(isTogether(shifts), false);
	});

	test('counts the biggest overlap', () => {
		const shifts = [
			w('10:00', '14:00'),
			w('10:00', '14:00'),
			w('12:00', '16:00'),
			w('18:00', '20:00')
		];
		assert.equal(parallelCount(shifts), 3);
		assert.equal(isTogether(shifts), true);
	});

	test('untimed shifts count as together', () => {
		assert.equal(isTogether([any, any]), true);
	});
});

describe('isDoableNow', () => {
	const day = { whenKind: 'date' as const, startsOn: '2026-11-20', endsOn: null };
	const range = { whenKind: 'range' as const, startsOn: '2026-11-18', endsOn: '2026-11-22' };

	test('needs a free shift', () => {
		assert.equal(isDoableNow(day, 0, '2026-11-20'), false);
		assert.equal(isDoableNow(day, 1, '2026-11-20'), true);
	});

	test('a date must be today, a range must contain today', () => {
		assert.equal(isDoableNow(day, 1, '2026-11-21'), false);
		assert.equal(isDoableNow(range, 1, '2026-11-18'), true);
		assert.equal(isDoableNow(range, 1, '2026-11-22'), true);
		assert.equal(isDoableNow(range, 1, '2026-11-23'), false);
	});
});

describe('localToday', () => {
	test('uses the space’s time zone, not UTC', () => {
		// 23:30 UTC on Nov 20 is already Nov 21 in Berlin
		assert.equal(localToday('Europe/Berlin', new Date('2026-11-20T23:30:00Z')), '2026-11-21');
		assert.equal(localToday('UTC', new Date('2026-11-20T23:30:00Z')), '2026-11-20');
	});
});

describe('byWindow', () => {
	test('timed by start, untimed last', () => {
		const sorted = [any, w('14:00', '16:00'), w('09:00', '10:00')].sort(byWindow);
		assert.deepEqual(
			sorted.map((s) => s.startsTime),
			['09:00', '14:00', null]
		);
	});
});
