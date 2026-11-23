import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { createDiskStorage } from './disk.ts';
import { createMemoryStorage } from './memory.ts';
import type { FileStorage } from './storage.ts';

const text = (s: string) => new TextEncoder().encode(s);
const read = async (stream: ReadableStream<Uint8Array>) =>
	new TextDecoder().decode(await new Response(stream).arrayBuffer());

const dir = await mkdtemp(join(tmpdir(), 'commonsdb-storage-'));
after(() => rm(dir, { recursive: true, force: true }));

// The same contract for every adapter: an S3 adapter gets this suite too.
for (const [name, storage] of [
	['disk', createDiskStorage(dir)],
	['memory', createMemoryStorage()]
] as [string, FileStorage][]) {
	describe(`${name} storage`, () => {
		test('put, get, replace, delete', async () => {
			await storage.put('ab/abc-123/large.webp', text('hello'));
			const file = await storage.get('ab/abc-123/large.webp');
			assert.ok(file);
			assert.equal(file.size, 5);
			assert.equal(await read(file.body), 'hello');

			await storage.put('ab/abc-123/large.webp', text('hello again'));
			assert.equal(await read((await storage.get('ab/abc-123/large.webp'))!.body), 'hello again');

			await storage.delete('ab/abc-123/large.webp');
			assert.equal(await storage.get('ab/abc-123/large.webp'), null);
			await storage.delete('ab/abc-123/large.webp'); // deleting twice is fine
		});

		test('byte ranges, for audio/video seeking later', async () => {
			await storage.put('r/file.bin', text('0123456789'));
			const part = await storage.get('r/file.bin', { range: { start: 2, end: 5 } });
			assert.equal(await read(part!.body), '2345');
			assert.equal(part!.size, 10, 'size is the whole file');
			const tail = await storage.get('r/file.bin', { range: { start: 7 } });
			assert.equal(await read(tail!.body), '789');
			await assert.rejects(storage.get('r/file.bin', { range: { start: 20 } }), RangeError);
		});

		test('keys cannot escape or be odd', async () => {
			for (const key of ['../etc/passwd', '/abs', 'a/../b', 'A/upper', '.hidden', 'a//b', 'a b']) {
				await assert.rejects(storage.put(key, text('x')), /Invalid storage key/, key);
			}
		});
	});
}

test('disk storage leaves no temporary files behind', async () => {
	const storage = createDiskStorage(dir);
	await storage.put('t/one.webp', text('1'));
	assert.deepEqual(await readdir(join(dir, 't')), ['one.webp']);
});
