import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';
import { createTestDb } from '@commonsdb/db/testing';
import { user } from '@commonsdb/db/schema';
import { ValidationError } from '../errors.ts';
import {
	completeOnboarding,
	ensureProfile,
	getProfile,
	isOnboarded,
	updateOwnProfile
} from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

const kim = { id: 'kim', name: 'Kim Example', email: 'kim@test.local' };
const actor = { id: kim.id, platformRole: 'member' as const };

const form = (over: Record<string, unknown> = {}) => ({
	displayName: 'Kim',
	pronoun: '',
	phone: '',
	accessibilityNote: '',
	visibility: 'members',
	photoVisibility: 'members',
	notifyByEmail: true,
	notifyNewTasks: false,
	...over
});

beforeEach(async () => {
	await t.reset();
	await db.insert(user).values(kim);
});

describe('profile', () => {
	test('ensureProfile creates one on first use, named after the account', async () => {
		const p = await ensureProfile(db, kim);
		assert.equal(p.displayName, 'Kim Example');
		assert.equal(isOnboarded(p), false);
		assert.equal((await ensureProfile(db, kim)).userId, kim.id, 'idempotent');
	});

	test('onboarding needs the house rules', async () => {
		await ensureProfile(db, kim);
		await assert.rejects(
			completeOnboarding(db, actor, form({ acceptRules: false })),
			(e) =>
				e instanceof ValidationError && e.fields.acceptRules === 'onboarding_rules_not_accepted'
		);
		// a caller that doesn't send the field at all gets a code too, not valibot's English
		await assert.rejects(
			completeOnboarding(db, actor, form()),
			(e) => e instanceof ValidationError && e.fields.acceptRules === 'field_required'
		);
		const p = await completeOnboarding(db, actor, form({ acceptRules: true }));
		assert.equal(isOnboarded(p), true);
		assert.ok(p.rulesAcceptedAt);
	});

	test('edits are validated and normalised', async () => {
		await ensureProfile(db, kim);
		await assert.rejects(
			updateOwnProfile(db, actor, form({ displayName: '  ', visibility: 'everyone' })),
			(e) =>
				e instanceof ValidationError &&
				e.fields.displayName === 'profile_display_name_required' &&
				e.fields.visibility === 'profile_visibility_invalid'
		);
		await updateOwnProfile(db, actor, form({ pronoun: ' sie ', phone: '' }));
		const p = await getProfile(db, kim.id);
		assert.equal(p.pronoun, 'sie');
		assert.equal(p.phone, null);
	});
});
