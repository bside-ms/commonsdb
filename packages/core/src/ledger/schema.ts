import * as v from 'valibot';

/**
 * A signed amount of repros as typed ("-2", "−1,5", 3) → integer tenths.
 * Half steps, never zero, at most 1000 either way.
 */
export const ReproChangeInput = v.pipe(
	v.union([v.number(), v.string()], 'ledger_amount_invalid'),
	v.transform((x) =>
		typeof x === 'number' ? x : Number(x.trim().replace('−', '-').replace(',', '.'))
	),
	v.number('ledger_amount_invalid'),
	v.check((n) => Number.isFinite(n), 'ledger_amount_invalid'),
	v.check((n) => n !== 0, 'ledger_amount_zero'),
	v.check((n) => Math.abs(n) <= 1000, 'ledger_amount_too_large'),
	v.check((n) => Number.isInteger(n * 2), 'ledger_amount_half_steps'),
	v.transform((n) => Math.round(n * 10))
);

export const AdjustmentInput = v.object({
	amount: ReproChangeInput,
	memo: v.pipe(
		v.string('ledger_memo_required'),
		v.trim(),
		v.nonEmpty('ledger_memo_required'),
		v.maxLength(500, 'ledger_memo_too_long')
	)
});
