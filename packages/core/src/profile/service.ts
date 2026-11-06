import {eq} from 'drizzle-orm';
import * as v from 'valibot';
import type {Db} from '@commonsdb/db';
import {profile, type Profile} from '@commonsdb/db/schema';
import {DomainError, ValidationError, type FieldErrors} from '../errors.ts';
import type {Actor} from '../roles.ts';
import {OnboardingInput, ProfileInput} from './schema.ts';

function parse<S extends v.GenericSchema>(schema: S, input: unknown): v.InferOutput<S> {
    const result = v.safeParse(schema, input);
    if (result.success) return result.output;

    const fields: FieldErrors = {};
    for (const issue of result.issues) {
        const key = v.getDotPath(issue) ?? '_';
        fields[key] ??= issue.message; // first error per field
    }
    throw new ValidationError(fields);
}

/** Runs once per new user (from the auth hook). Idempotent. */
export async function provisionProfile(db: Db, user: { id: string; name: string; email: string }) {
    await db
        .insert(profile)
        .values({userId: user.id, displayName: user.name.trim() || user.email.split('@')[0]})
        .onConflictDoNothing();
}

export async function getProfile(db: Db, userId: string): Promise<Profile> {
    const row = await db.query.profile.findFirst({where: eq(profile.userId, userId)});
    if (!row) throw new DomainError('profile_not_found');
    return row;
}

/** A person edits their own profile. */
export async function updateOwnProfile(db: Db, actor: Actor, input: unknown): Promise<Profile> {
    const data = parse(ProfileInput, input);
    const [row] = await db
        .update(profile)
        .set(data)
        .where(eq(profile.userId, actor.id))
        .returning();
    if (!row) throw new DomainError('profile_not_found');
    return row;
}

/** First-login onboarding: profile fields plus house rules, once. */
export async function completeOnboarding(db: Db, actor: Actor, input: unknown): Promise<Profile> {
    const {acceptRules: _, ...data} = parse(OnboardingInput, input);
    const now = new Date();
    const [row] = await db
        .update(profile)
        .set({...data, onboardedAt: now, rulesAcceptedAt: now})
        .where(eq(profile.userId, actor.id))
        .returning();
    if (!row) throw new DomainError('profile_not_found');
    return row;
}

export const isOnboarded = (p: Profile) => p.onboardedAt !== null;