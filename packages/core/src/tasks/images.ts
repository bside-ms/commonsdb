/*
 * Task and series photos (slice 6c). The task form posts an upload id;
 * this decides whether the actor may put that upload on a task.
 */
import { and, eq } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { upload } from '@commonsdb/db/schema';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';

/**
 * Keeping the current photo is always fine. A different one must be an
 * image the actor uploaded: otherwise a forged id could put someone else's
 * upload (say, a private profile picture) on a task every member sees.
 */
export async function assertUsableImage(
	db: Db,
	actor: Actor,
	imageId: string | null,
	current: string | null = null
): Promise<void> {
	if (imageId === null || imageId === current) return;
	const own = await db.query.upload.findFirst({
		where: and(eq(upload.id, imageId), eq(upload.uploadedBy, actor.id), eq(upload.kind, 'image')),
		columns: { id: true }
	});
	if (!own) throw new ValidationError({ image: 'upload_not_found' });
}
