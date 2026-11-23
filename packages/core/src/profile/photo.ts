/*
 * Who sees whose profile picture (slice 6c). The person themselves always;
 * others by photo visibility: 'members' everyone, 'admins' only admins,
 * 'nobody' nobody else, superadmins included.
 * Uploading and removing live in core/uploads (they need the storage).
 */
import { sql } from 'drizzle-orm';
import { profile, type Profile } from '@commonsdb/db/schema';
import { isAdmin, type Actor } from '../roles.ts';

export function maySeePhoto(
	actor: Actor,
	owner: Pick<Profile, 'userId' | 'photoVisibility'>
): boolean {
	if (owner.userId === actor.id) return true;
	if (owner.photoVisibility === 'members') return true;
	return owner.photoVisibility === 'admins' && isAdmin(actor);
}

/**
 * The same rule as a select column: the photo's upload id, or null where
 * the actor may not see it. For read models that list people.
 */
export function visiblePhotoId(actor: Actor) {
	const visibilities = isAdmin(actor) ? ['members', 'admins'] : ['members'];
	return sql<
		string | null
	>`case when ${profile.userId} = ${actor.id} or ${profile.photoVisibility} in (${sql.join(
		visibilities.map((v) => sql`${v}`),
		sql`, `
	)}) then ${profile.photoId} end`;
}
