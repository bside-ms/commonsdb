/**
 * Domain errors carry a code, never user-facing text.
 * The UI maps codes to translated messages.
 *
 * Plain fields instead of `constructor(readonly code …)`: parameter
 * properties are not erasable syntax, so Node's type stripping (seed
 * script, later the worker) refuses to run this file.
 */
export class DomainError extends Error {
	readonly code: string;
	readonly field?: string;

	constructor(code: string, field?: string) {
		super(code);
		this.name = 'DomainError';
		this.code = code;
		this.field = field;
	}
}

export type FieldErrors = Record<string, string>;

export class ValidationError extends DomainError {
	readonly fields: FieldErrors;

	constructor(fields: FieldErrors) {
		super('validation_failed');
		this.name = 'ValidationError';
		this.fields = fields;
	}
}
