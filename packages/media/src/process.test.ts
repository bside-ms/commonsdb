import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp, { type Exif } from 'sharp';
import { MediaError, processUpload } from './process.ts';

/** A test photo, generated: `w`×`h` pixels, optionally with EXIF. */
async function photo(
	w: number,
	h: number,
	{
		format = 'jpeg',
		exif,
		orientation
	}: { format?: 'jpeg' | 'png' | 'webp'; exif?: Exif; orientation?: number } = {}
) {
	let img = sharp({ create: { width: w, height: h, channels: 3, background: '#f0703a' } });
	if (exif) img = img.withExif(exif);
	if (orientation) img = img.withMetadata({ orientation });
	return new Uint8Array(await img.toFormat(format).toBuffer());
}

const codeOf = async (p: Promise<unknown>) =>
	p.then(
		() => 'ok',
		(e) => (e instanceof MediaError ? e.code : `unexpected: ${e}`)
	);

test('an image becomes a large and a thumb WebP, never upscaled', async () => {
	const big = await processUpload(await photo(4000, 3000));
	assert.equal(big.kind, 'image');
	assert.equal(big.mime, 'image/jpeg');
	assert.deepEqual(big.meta, { width: 4000, height: 3000 });
	assert.deepEqual(
		big.variants.map((v) => [v.name, v.mime, v.width, v.height]),
		[
			['large', 'image/webp', 1600, 1200],
			['thumb', 'image/webp', 480, 360]
		]
	);

	const small = await processUpload(await photo(300, 200, { format: 'png' }));
	assert.deepEqual(
		small.variants.map((v) => [v.name, v.width, v.height]),
		[
			['large', 300, 200],
			['thumb', 300, 200]
		]
	);
});

test('metadata is gone: no EXIF, no GPS in what we store', async () => {
	const withGps = await photo(800, 600, {
		exif: {
			IFD0: { Make: 'PhoneCo', Model: 'X1' },
			IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 57/1 0/1' }
		}
	});
	assert.ok((await sharp(withGps).metadata()).exif, 'the input does carry EXIF');

	const { variants } = await processUpload(withGps);
	for (const v of variants) {
		const meta = await sharp(v.data).metadata();
		assert.equal(meta.exif, undefined, `${v.name} has EXIF`);
		assert.equal(meta.icc, undefined, `${v.name} has an ICC profile`);
		assert.equal(meta.xmp, undefined, `${v.name} has XMP`);
	}
});

test('EXIF orientation is applied to the pixels before it is dropped', async () => {
	// stored as 800×600 landscape, but flagged "rotate 90°": a portrait photo
	const portrait = await photo(800, 600, { orientation: 6 });
	assert.equal((await sharp(portrait).metadata()).orientation, 6, 'the input is flagged');
	const { meta, variants } = await processUpload(portrait);
	assert.deepEqual(meta, { width: 600, height: 800 });
	assert.deepEqual([variants[0].width, variants[0].height], [600, 800]);
});

test('rejects what is not an image we take, whatever its name claims', async () => {
	assert.equal(await codeOf(processUpload(new Uint8Array())), 'upload_empty');
	assert.equal(
		await codeOf(processUpload(new TextEncoder().encode('just text, named photo.jpg'))),
		'upload_type_unsupported'
	);
	const gif = new Uint8Array(
		await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } })
			.gif()
			.toBuffer()
	);
	assert.equal(await codeOf(processUpload(gif)), 'upload_type_unsupported', 'GIF has no processor');

	const pdf = new TextEncoder().encode('%PDF-1.7\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF');
	assert.equal(await codeOf(processUpload(pdf)), 'upload_type_unsupported', 'documents: not yet');
});

test('a profile picture slot can refuse other kinds', async () => {
	const jpeg = await photo(100, 100);
	assert.equal(
		await codeOf(processUpload(jpeg, { allow: ['document'] })),
		'upload_type_unsupported'
	);
	assert.equal(await codeOf(processUpload(jpeg, { allow: ['image'] })), 'ok');
});

test('size and pixel limits', async () => {
	const tooBig = new Uint8Array(10 * 1024 * 1024 + 1);
	tooBig.set(await photo(10, 10)); // a JPEG header, padded past 10 MB
	assert.equal(await codeOf(processUpload(tooBig)), 'upload_too_large');

	// a small PNG that decodes to 100 megapixels
	const bomb = new Uint8Array(
		await sharp({ create: { width: 10000, height: 10000, channels: 3, background: '#fff' } })
			.png({ compressionLevel: 9 })
			.toBuffer()
	);
	assert.ok(bomb.length < 1024 * 1024, 'the bomb is small on disk');
	assert.equal(await codeOf(processUpload(bomb)), 'upload_unreadable');
});

test('a broken file with an image header is rejected', async () => {
	const jpeg = await photo(400, 300);
	assert.equal(await codeOf(processUpload(jpeg.slice(0, 200))), 'upload_unreadable');
});
