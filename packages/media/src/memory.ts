import { assertValidKey, resolveRange, type FileStorage } from './storage.ts';

/** FileStorage in memory, for tests. `files` is exposed so tests can look inside. */
export function createMemoryStorage(): FileStorage & { files: Map<string, Uint8Array> } {
	const files = new Map<string, Uint8Array>();

	return {
		files,

		async put(key, data) {
			assertValidKey(key);
			files.set(key, new Uint8Array(data));
		},

		async get(key, options) {
			assertValidKey(key);
			const data = files.get(key);
			if (!data) return null;
			const range = resolveRange(options?.range, data.length);
			if (!range) throw new RangeError('range_not_satisfiable');
			const part = data.subarray(range.start, range.end + 1);
			return { body: new Blob([new Uint8Array(part)]).stream(), size: data.length };
		},

		async delete(key) {
			assertValidKey(key);
			files.delete(key);
		}
	};
}
