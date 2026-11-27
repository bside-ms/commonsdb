/**
 * Client roles from a Keycloak access token: resource_access.<clientId>.roles.
 * The token comes straight from Keycloak's token endpoint (over TLS, in
 * the callback), so it isn't verified again here.
 * null = unreadable: the caller must then change nothing, rather than
 * treat it as "no roles" and demote everyone.
 */
export function keycloakClientRoles(accessToken: string, clientId: string): string[] | null {
	try {
		const payload = JSON.parse(
			Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8')
		);
		const roles = payload?.resource_access?.[clientId]?.roles;
		if (roles === undefined) return [];
		return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : null;
	} catch {
		return null;
	}
}
