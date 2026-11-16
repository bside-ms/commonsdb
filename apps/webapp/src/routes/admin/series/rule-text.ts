import type { SeriesRule } from '@commonsdb/core';
import { m } from '#lib/paraglide/messages.js';
import { weekdayName } from '#lib/format.ts';

const nthWord = (n: 1 | 2 | 3 | 4 | 5) =>
	[
		m.series_nth_word_1,
		m.series_nth_word_2,
		m.series_nth_word_3,
		m.series_nth_word_4,
		m.series_nth_word_5
	][n - 1]();

/** The rule in one line: "Jeden Mittwoch", "Jeden ersten Samstag im Monat" ... */
export function ruleText(rule: SeriesRule): string {
	switch (rule.repeat) {
		case 'weekly':
		case 'biweekly':
			if ('weekday' in rule) {
				const weekday = weekdayName(rule.weekday);
				return rule.repeat === 'weekly'
					? m.series_rule_weekly({ weekday })
					: m.series_rule_biweekly({ weekday });
			} else {
				const window = {
					from: weekdayName(rule.fromWeekday, 'short'),
					to: weekdayName(rule.toWeekday, 'short')
				};
				return rule.repeat === 'weekly'
					? m.series_rule_weekly_window(window)
					: m.series_rule_biweekly_window(window);
			}
		case 'monthly':
			if ('nth' in rule)
				return m.series_rule_monthly_nth({
					nth: nthWord(rule.nth),
					weekday: weekdayName(rule.weekday)
				});
			if ('day' in rule) return m.series_rule_monthly_day({ day: String(rule.day) });
			return m.series_rule_monthly_window({ from: String(rule.fromDay), to: String(rule.toDay) });
		case 'every_n_days':
			return m.series_rule_every_n_days({ days: String(rule.days) });
		case 'manual':
			return m.series_rule_manual();
	}
}
