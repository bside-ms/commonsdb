import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { parseRichText, toHtml } from '@commonsdb/richtext';
import type { PageServerLoad } from './$types';

const sample = {
	type: 'doc',
	content: [
		{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Was zu tun ist' }] },
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'Die Hecke am Hof zurückschneiden. Werkzeug liegt im ' },
				{ type: 'text', text: 'Schuppen', marks: [{ type: 'bold' }] },
				{ type: 'text', text: ', Anleitung im ' },
				{
					type: 'text',
					text: 'Wiki',
					marks: [{ type: 'link', attrs: { href: 'https://example.org' } }]
				},
				{ type: 'text', text: '.' }
			]
		},
		{
			type: 'bulletList',
			content: ['Handschuhe', 'Schere', 'Grünschnittsäcke'].map((t) => ({
				type: 'listItem',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }]
			}))
		}
	]
};

/** Component showcase, dev server only. */
export const load: PageServerLoad = () => {
	if (!dev) error(404);
	const parsed = parseRichText('description', sample);
	if (!parsed.ok) error(500, `sample doc invalid: ${parsed.reason}`);
	return { richText: { doc: parsed.doc, html: toHtml('description', parsed.doc) } };
};

/** Echoes what the editor posts, to see the round trip. */
export const actions = {
	richtext: async ({ request }) => {
		if (!dev) error(404);
		const parsed = parseRichText('description', (await request.formData()).get('description'));
		return parsed.ok
			? { richText: { ok: true, html: toHtml('description', parsed.doc) } }
			: { richText: { ok: false, reason: parsed.reason } };
	}
} satisfies import('./$types').Actions;
