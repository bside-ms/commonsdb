import { resolve } from '$app/paths';

/** Where an upload's variant is served (routes/media). Core never builds URLs. */
export const mediaUrl = (id: string, variant: 'large' | 'thumb' | (string & {})) =>
	resolve('/media/[id]/[variant]', { id, variant });
