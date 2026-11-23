/**
 * What can be uploaded. The kinds are fixed now so the schema never has
 * to change; which of them are *accepted* depends on which have a
 * processor (process.ts). Today: images only.
 */
export const UPLOAD_KINDS = ['image', 'document', 'audio', 'video'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

/** Upper size limit per kind, in bytes, checked before anything is read. */
export const MAX_BYTES: Record<UploadKind, number> = {
	image: 10 * 1024 * 1024,
	document: 20 * 1024 * 1024,
	audio: 50 * 1024 * 1024,
	video: 200 * 1024 * 1024
};

/** The largest limit of any kind: what a request may carry at most. */
export const MAX_UPLOAD_BYTES = Math.max(...Object.values(MAX_BYTES));

/** Detected mime type → kind. Unknown types have no kind and are rejected. */
export function kindOf(mime: string): UploadKind | null {
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('audio/')) return 'audio';
	if (mime.startsWith('video/')) return 'video';
	if (mime === 'application/pdf') return 'document';
	return null;
}

/**
 * Mime types each kind can be uploaded as today. A kind with no entry has
 * no processor yet and is rejected. Kept here, free of dependencies, so the
 * browser can use it for `<input accept>` without loading sharp.
 */
export const ACCEPTED_MIME: Partial<Record<UploadKind, readonly string[]>> = {
	image: ['image/jpeg', 'image/png', 'image/webp']
};

/** For `<input accept>`. */
export const ACCEPTED_TYPES = Object.values(ACCEPTED_MIME).flat();
