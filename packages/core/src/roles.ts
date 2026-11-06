export const PLATFORM_ROLES = ['member', 'admin', 'superadmin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** The minimum core needs to know about whoever is acting. */
export type Actor = { id: string; platformRole: PlatformRole };

export const isSuperadmin = (a: Actor) => a.platformRole === 'superadmin';
/** "Admin" means admin or above. Category-scoped capabilities come in slice 2. */
export const isAdmin = (a: Actor) => a.platformRole === 'admin' || isSuperadmin(a);