// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { AuthSession } from '@commonsdb/auth';
import type { Actor } from '@commonsdb/core';
import type { Profile } from '@commonsdb/db/schema';

declare global {
	namespace App {
		interface Locals {
			user?: AuthSession['user'];
			session?: AuthSession['session'];
			/** what core needs to know about the current user */
			actor?: Actor;
			profile?: Profile;
		}
	}
}

export {};
