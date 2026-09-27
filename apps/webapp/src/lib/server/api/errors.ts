/**
 * Laravel's error shapes, normalised.
 *
 * 422 returns { message, errors: { field: [msg, ...] } }. The UI wants
 * one message per field, so flatten early and let FormField render it.
 */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly fields: Record<string, string> = {}
	) {
		super(message);
		this.name = 'ApiError';
	}

	get isValidation(): boolean {
		return this.status === 422;
	}
}

type LaravelError = {
	message?: string;
	errors?: Record<string, string[]>;
};

export function toApiError(status: number, body: unknown): ApiError {
	const payload = (body ?? {}) as LaravelError;

	const fields = Object.fromEntries(
		Object.entries(payload.errors ?? {}).map(([field, messages]) => [field, messages[0] ?? ''])
	);

	const fallback =
		status === 401
			? 'Nicht angemeldet.'
			: status === 403
				? 'Dafür fehlt dir die Berechtigung.'
				: status >= 500
					? 'Der Server hat nicht geantwortet. Bitte später noch einmal versuchen.'
					: 'Die Anfrage konnte nicht verarbeitet werden.';

	return new ApiError(status, payload.message ?? fallback, fields);
}
