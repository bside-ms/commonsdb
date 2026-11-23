import { fileTypeFromBuffer } from 'file-type';
import { kindOf, type UploadKind } from './kinds.ts';

export type DetectedType = { mime: string; ext: string; kind: UploadKind };

/**
 * The file's real type, read from its first bytes. The browser's claim
 * and the file name are ignored: a renamed .exe stays an .exe. null when
 * the type is unknown or belongs to no kind we know.
 */
export async function detectType(data: Uint8Array): Promise<DetectedType | null> {
	const found = await fileTypeFromBuffer(data);
	if (!found) return null;
	const kind = kindOf(found.mime);
	return kind ? { mime: found.mime, ext: found.ext, kind } : null;
}
