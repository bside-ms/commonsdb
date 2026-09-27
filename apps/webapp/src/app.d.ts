import type { UserResource } from '$lib/api/generated/types.gen';

declare global {
	namespace App {
		interface Locals {
			/**
			 * The Laravel API token for this request, read from the
			 * httpOnly cookie in hooks.server.ts. Server-side only — it never reaches the browser.
			 */
			accessToken: string | null;
		}

		interface PageData {
			user?: UserResource;
		}
	}
}

export {};
