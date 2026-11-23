import sharp, { type Metadata } from 'sharp';
import { detectType } from './detect.ts';
import { ACCEPTED_MIME, MAX_BYTES, type UploadKind } from './kinds.ts';

/**
 * Turns an uploaded file into what we store: one or more variants, plus
 * a little metadata. One processor per kind; a kind without a processor
 * (today: everything but images) is rejected. Adding PDFs later means a
 * processor here and their mime type in ACCEPTED_MIME (kinds.ts).
 */

/** Error codes, translated by the app like core's codes. */
export type MediaErrorCode =
	'upload_empty' | 'upload_too_large' | 'upload_type_unsupported' | 'upload_unreadable';

export class MediaError extends Error {
	readonly code: MediaErrorCode;
	constructor(code: MediaErrorCode) {
		super(code);
		this.name = 'MediaError';
		this.code = code;
	}
}

export type Variant = {
	/** 'large', 'thumb'; later 'original', 'preview', 'poster'. */
	name: string;
	mime: string;
	/** File extension of the stored variant, for its storage key. */
	ext: string;
	data: Uint8Array;
	width?: number;
	height?: number;
};

export type Processed = {
	kind: UploadKind;
	/** The detected type of what was uploaded (not of the variants). */
	mime: string;
	/** Kind-specific facts: { width, height } for images. */
	meta: Record<string, number | string>;
	variants: Variant[];
};

type Processor = {
	process(data: Uint8Array): Promise<Omit<Processed, 'kind' | 'mime'>>;
};

// ---- images -------------------------------------------------------------------

export const IMAGE_SIZES = { large: 1600, thumb: 480 } as const;

/** Decompression bombs: a tiny file that decodes to gigapixels. 40 MP covers every phone. */
const MAX_PIXELS = 40_000_000;

const image: Processor = {
	async process(data) {
		const open = () => sharp(data, { limitInputPixels: MAX_PIXELS, failOn: 'error' });

		let source: Metadata;
		try {
			source = await open().metadata();
		} catch {
			throw new MediaError('upload_unreadable');
		}
		// The size as people see it: EXIF orientation 5–8 turns the stored pixels by 90°.
		const { width, height } = source.autoOrient;

		// .autoOrient() turns the pixels as the EXIF orientation says. sharp
		// then writes no metadata at all (no EXIF, no GPS, no camera serial):
		// metadata is only kept when asked for with .keepMetadata().
		const variant = async (name: keyof typeof IMAGE_SIZES, quality: number): Promise<Variant> => {
			try {
				const size = IMAGE_SIZES[name];
				const { data: out, info } = await open()
					.autoOrient()
					.resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
					.webp({ quality })
					.toBuffer({ resolveWithObject: true });
				return {
					name,
					mime: 'image/webp',
					ext: 'webp',
					data: new Uint8Array(out),
					width: info.width,
					height: info.height
				};
			} catch {
				throw new MediaError('upload_unreadable');
			}
		};

		return {
			meta: { width, height },
			variants: [await variant('large', 82), await variant('thumb', 76)]
		};
	}
};

const PROCESSORS: Partial<Record<UploadKind, Processor>> = { image };

// ---- entry point --------------------------------------------------------------

/**
 * Check and process an upload. Throws MediaError with a code when the
 * file is empty, too large, of a type we don't take, or broken.
 * `allow` narrows the kinds a caller accepts (a profile picture: images).
 */
export async function processUpload(
	data: Uint8Array,
	{ allow }: { allow?: readonly UploadKind[] } = {}
): Promise<Processed> {
	if (data.length === 0) throw new MediaError('upload_empty');

	const type = await detectType(data);
	if (!type || (allow && !allow.includes(type.kind))) {
		throw new MediaError('upload_type_unsupported');
	}
	if (data.length > MAX_BYTES[type.kind]) throw new MediaError('upload_too_large');

	const processor = PROCESSORS[type.kind];
	if (!processor || !ACCEPTED_MIME[type.kind]?.includes(type.mime)) {
		throw new MediaError('upload_type_unsupported');
	}
	return { kind: type.kind, mime: type.mime, ...(await processor.process(data)) };
}

/** Kinds that can actually be uploaded right now. */
export const SUPPORTED_KINDS = Object.keys(PROCESSORS) as UploadKind[];
