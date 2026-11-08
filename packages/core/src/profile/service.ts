import { eq } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { profile, type Profile } from '@commonsdb/db/schema';
import { DomainError } from '../errors.ts';
import { parse } from '../validation.ts';
import type { Actor } from '../roles.ts';
import { OnboardingInput, ProfileInput } from './schema.ts';

/** Runs once per new user (from the auth hook). Idempotent. */
export async function provisionProfile(db: Db, user: { id: string; name: string; email: string }) {
	await db
		.insert(profile)
		.values({ userId: user.id, displayName: user.name.trim() || user.email.split('@')[0] })
		.onConflictDoNothing();
}

/**
 * Returns the profile, creating it if missing. Covers users who existed
 * before profiles did and any hook that failed.
 */
export async function ensureProfile(
	db: Db,
	user: { id: string; name: string; email: string }
): Promise<Profile> {
	const existing = await db.query.profile.findFirst({ where: eq(profile.userId, user.id) });
	if (existing) return existing;
	await provisionProfile(db, user);
	return getProfile(db, user.id);
}

export async function getProfile(db: Db, userId: string): Promise<Profile> {
	const row = await db.query.profile.findFirst({ where: eq(profile.userId, userId) });
	if (!row) throw new DomainError('profile_not_found');
	return row;
}

/** A person edits their own profile. */
export async function updateOwnProfile(db: Db, actor: Actor, input: unknown): Promise<Profile> {
	const data = parse(ProfileInput, input);
	const [row] = await db.update(profile).set(data).where(eq(profile.userId, actor.id)).returning();
	if (!row) throw new DomainError('profile_not_found');
	return row;
}

/** First-login onboarding: profile fields plus house rules, once. */
export async function completeOnboarding(db: Db, actor: Actor, input: unknown): Promise<Profile> {
	const { acceptRules: _, ...data } = parse(OnboardingInput, input);
	const now = new Date();
	const [row] = await db
		.update(profile)
		.set({ ...data, onboardedAt: now, rulesAcceptedAt: now })
		.where(eq(profile.userId, actor.id))
		.returning();
	if (!row) throw new DomainError('profile_not_found');
	return row;
}

export const isOnboarded = (p: Profile) => p.onboardedAt !== null;
