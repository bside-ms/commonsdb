/** Only same-site relative targets, no open redirect. */
export const safeRedirect = (t: string | null) =>
	t?.startsWith('/') && !t.startsWith('//') ? t : '/';
