import * as v from 'valibot';
import { ValidationError, type FieldErrors } from './errors.ts';

/**
 * Parse input with a valibot schema or throw a ValidationError carrying
 * one code per field. Moved out of profile/service.ts so every module
 * shares it (profile/service.ts then imports it from here).
 */
export function parse<S extends v.GenericSchema>(schema: S, input: unknown): v.InferOutput<S> {
	const result = v.safeParse(schema, input);
	if (result.success) return result.output;

	const fields: FieldErrors = {};
	for (const issue of result.issues) {
		const key = v.getDotPath(issue) ?? '_';
		fields[key] ??= codeOf(issue); // first error per field
	}
	throw new ValidationError(fields);
}

/**
 * Our schemas put codes into their messages. One case they can't reach:
 * a required key that is missing altogether, where valibot reports its
 * own English text ("Invalid key: …"). That becomes `field_required`.
 */
function codeOf(issue: v.BaseIssue<unknown>): string {
	const missingKey =
		issue.kind === 'schema' && issue.type === 'object' && issue.input === undefined;
	return missingKey ? 'field_required' : issue.message;
}

/** Trimmed optional text; '' becomes null so the DB never stores empty strings. */
export const optionalText = (max: number, code: string) =>
	v.pipe(
		v.optional(v.nullable(v.string()), ''),
		v.transform((s) => (s ?? '').trim()),
		v.maxLength(max, code),
		v.transform((s) => (s === '' ? null : s))
	);

/** Checkboxes arrive as 'on' / missing from forms, as booleans from code. */
export const checkbox = () =>
	v.pipe(
		v.optional(v.union([v.boolean(), v.string()]), false),
		v.transform((x) => x === true || x === 'on' || x === 'true')
	);
