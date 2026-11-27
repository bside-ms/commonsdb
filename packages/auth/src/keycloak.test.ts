import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keycloakClientRoles } from './keycloak.ts';

const token = (payload: unknown) =>
	['x', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'sig'].join('.');

test('reads the client roles', () => {
	const t = token({
		resource_access: { commonsdb: { roles: ['commonsdb_user', 'commonsdb_admin'] } }
	});
	assert.deepEqual(keycloakClientRoles(t, 'commonsdb'), ['commonsdb_user', 'commonsdb_admin']);
});

test('no roles for this client → empty; garbage → null (change nothing)', () => {
	assert.deepEqual(
		keycloakClientRoles(token({ resource_access: { other: { roles: ['x'] } } }), 'commonsdb'),
		[]
	);
	assert.equal(keycloakClientRoles('not-a-jwt', 'commonsdb'), null);
});
