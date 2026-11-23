/**
 * The FileStorage port (ARCHITECTURE.md): where uploaded files live.
 *
 * Files are addressed by an opaque key that core chooses; adapters never
 * interpret it beyond storing it. No paths or URLs leave this boundary:
 * the app serves every file itself (`/media`), so access rules stay in
 * one place whatever the storage is.
 *
 * Implementations: local disk (default, `disk.ts`), memory (tests,
 * `memory.ts`). Later: S3-compatible object storage, which supports
 * byte ranges natively.
 */

/** Inclusive byte range, as in an HTTP Range header. `end` defaults to the last byte. */
export type ByteRange = { start: number; end?: number };

export type StoredFile = {
	/** The requested bytes (all, or the range). */
	body: ReadableStream<Uint8Array>;
	/** Size of the whole file, not of the range. */
	size: number;
};

export interface FileStorage {
	/** Store (or replace) a file. */
	put(key: string, data: Uint8Array): Promise<void>;
	/** null when there is no file under that key. */
	get(key: string, options?: { range?: ByteRange }): Promise<StoredFile | null>;
	/** Remove a file; removing a missing file is not an error. */
	delete(key: string): Promise<void>;
}

/**
 * Keys are lowercase segments joined by '/': letters, digits, '-', '_',
 * '.', never starting with a dot. Rules out '..', absolute paths and
 * anything a filesystem or bucket might read specially.
 */
const KEY = /^[a-z0-9][a-z0-9_-]*(\.[a-z0-9]+)?(\/[a-z0-9][a-z0-9_-]*(\.[a-z0-9]+)?)*$/;

export function assertValidKey(key: string) {
	if (!KEY.test(key) || key.length > 200) throw new Error(`Invalid storage key: ${key}`);
}

/** Clamp a requested range to a file size; null when it can't be satisfied. */
export function resolveRange(range: ByteRange | undefined, size: number) {
	if (!range) return { start: 0, end: size - 1 };
	const end = Math.min(range.end ?? size - 1, size - 1);
	if (range.start < 0 || range.start > end) return null;
	return { start: range.start, end };
}
