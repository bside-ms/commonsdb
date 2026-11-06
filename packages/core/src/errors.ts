/**
 * Domain errors carry a code, never user-facing text.
 * The UI maps codes to translated messages.
 */
export class DomainError extends Error {
    constructor(
        readonly code: string,
        readonly field?: string
    ) {
        super(code);
        this.name = 'DomainError';
    }
}

export type FieldErrors = Record<string, string>;

export class ValidationError extends DomainError {
    constructor(readonly fields: FieldErrors) {
        super('validation_failed');
        this.name = 'ValidationError';
    }
}