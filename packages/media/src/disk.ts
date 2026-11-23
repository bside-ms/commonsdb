import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { assertValidKey, resolveRange, type FileStorage } from './storage.ts';

/**
 * FileStorage on the local disk. `root` is a directory outside the app,
 * on a server a mounted volume (UPLOAD_DIR). Writes go to a temporary
 * file first and are renamed into place, so a crash never leaves a
 * half-written file under a real key.
 */
export function createDiskStorage(root: string): FileStorage {
	const base = resolve(root);
	const pathOf = (key: string) => {
		assertValidKey(key);
		return join(base, key);
	};

	return {
		async put(key, data) {
			const path = pathOf(key);
			await mkdir(dirname(path), { recursive: true });
			const tmp = `${path}.${randomUUID()}.tmp`;
			await writeFile(tmp, data);
			await rename(tmp, path);
		},

		async get(key, options) {
			const path = pathOf(key);
			const info = await stat(path).catch(() => null);
			if (!info?.isFile()) return null;
			const range = resolveRange(options?.range, info.size);
			if (!range) throw new RangeError('range_not_satisfiable');
			const stream = createReadStream(path, { start: range.start, end: range.end });
			return { body: Readable.toWeb(stream) as ReadableStream<Uint8Array>, size: info.size };
		},

		async delete(key) {
			await rm(pathOf(key), { force: true });
		}
	};
}
