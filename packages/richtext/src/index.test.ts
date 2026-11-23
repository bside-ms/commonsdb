import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	parseRichText,
	toHtml,
	toText,
	type RichTextDoc,
	fromPlainText,
	toMarkdown
} from './index.ts';

const doc = (...content: unknown[]) => ({ type: 'doc', content });
const p = (...content: unknown[]) => ({ type: 'paragraph', content });
const text = (t: string, marks?: unknown[]) => ({ type: 'text', text: t, ...(marks && { marks }) });
const link = (href: string) => ({ type: 'link', attrs: { href } });

const parse = (input: unknown) => parseRichText('description', input);

test('empty input and empty documents become null', () => {
	assert.deepEqual(parse(''), { ok: true, doc: null });
	assert.deepEqual(parse(null), { ok: true, doc: null });
	assert.deepEqual(parse(doc(p())), { ok: true, doc: null });
	assert.deepEqual(parse(JSON.stringify(doc({ type: 'paragraph' }))), { ok: true, doc: null });
});

test('accepts the profile, as object or JSON string', () => {
	const d = doc(
		{ type: 'heading', attrs: { level: 2 }, content: [text('Werkzeug')] },
		{ type: 'bulletList', content: [{ type: 'listItem', content: [p(text('Schere'))] }] },
		p(text('Fragen an '), text('Kim', [{ type: 'bold' }]), text('.'))
	);
	assert.equal(parse(d).ok, true);
	assert.equal(parse(JSON.stringify(d)).ok, true);
});

test('rejects what the profile does not have', () => {
	assert.deepEqual(parse('{nope'), { ok: false, reason: 'json' });
	assert.deepEqual(parse(doc({ type: 'codeBlock', content: [text('x')] })), {
		ok: false,
		reason: 'schema'
	});
	assert.deepEqual(parse(doc({ type: 'heading', attrs: { level: 1 }, content: [text('x')] })), {
		ok: false,
		reason: 'schema'
	});
	assert.deepEqual(parse(doc(p(text('x', [{ type: 'strike' }])))), { ok: false, reason: 'schema' });
	assert.deepEqual(parse(doc(text('loose text'))), { ok: false, reason: 'schema' });
	assert.deepEqual(parse(p(text('not a doc'))), { ok: false, reason: 'schema' });
	assert.deepEqual(parse('x'.repeat(200_000)), { ok: false, reason: 'too_large' });
});

test('only safe link protocols', () => {
	assert.equal(parse(doc(p(text('a', [link('https://b-side.ms')])))).ok, true);
	assert.equal(parse(doc(p(text('a', [link('mailto:kim@b-side.ms')])))).ok, true);
	assert.deepEqual(parse(doc(p(text('a', [link('javascript:alert(1)')])))), {
		ok: false,
		reason: 'link'
	});
	assert.deepEqual(parse(doc(p(text('a', [link('data:text/html,x')])))), {
		ok: false,
		reason: 'link'
	});
});

test('renders escaped HTML with safe link attributes', () => {
	const result = parse(
		doc(p(text('<script>x</script> '), text('Wiki', [link('https://b-side.ms')])))
	);
	assert.ok(result.ok && result.doc);
	const html = toHtml('description', result.doc);
	assert.ok(!html.includes('<script>'), html);
	assert.match(html, /&lt;script&gt;/);
	assert.match(html, /<a [^>]*href="https:\/\/b-side\.ms"/);
	assert.match(html, /rel="noopener noreferrer nofollow"/);
	assert.match(html, /target="_blank"/);
	assert.equal(toText('description', result.doc), '<script>x</script> Wiki');
	assert.equal(toHtml('description', null), '');
});

test('drops attributes the schema does not know', () => {
	const result = parse(doc({ type: 'paragraph', attrs: { onclick: 'x' }, content: [text('a')] }));
	assert.ok(result.ok && result.doc);
	assert.equal(JSON.stringify(result.doc).includes('onclick'), false);
	assert.ok(!toHtml('description', result.doc as RichTextDoc).includes('onclick'));
});

// ---- message profile (slice 6a) ----------------------------------------------

test('message: strike, inline code and code blocks are allowed', () => {
	const result = parseRichText(
		'message',
		doc(p(text('weg', [{ type: 'strike' }]), text(' '), text('npm i', [{ type: 'code' }])), {
			type: 'codeBlock',
			content: [text('x = 1')]
		})
	);
	assert.equal(result.ok, true);
	assert.match(
		toHtml('message', result.ok ? result.doc : null),
		/<s>weg<\/s>.*<code>npm i<\/code>/s
	);
});

test('message: headings and quotes are rejected', () => {
	for (const node of [
		{ type: 'heading', attrs: { level: 2 }, content: [text('Titel')] },
		{ type: 'blockquote', content: [p(text('Zitat'))] }
	]) {
		assert.deepEqual(parseRichText('message', doc(node)), {
			ok: false,
			reason: 'schema'
		});
	}
});

test('fromPlainText: blank lines split paragraphs, single newlines become breaks', () => {
	assert.equal(fromPlainText('  \n '), null);
	const result = fromPlainText('Zeile 1\nZeile 2\n\nAbsatz 2');
	assert.deepEqual(
		result,
		doc(p(text('Zeile 1'), { type: 'hardBreak' }, text('Zeile 2')), p(text('Absatz 2')))
	);
	assert.equal(parseRichText('message', result).ok, true);
});

// ---- news profile (slice 7) ----------------------------------------------------

test('news: marks, links and lists are allowed', () => {
	const result = parseRichText(
		'news',
		doc(p(text('Am '), { type: 'text', text: 'Samstag', marks: [{ type: 'bold' }] }), {
			type: 'bulletList',
			content: [{ type: 'listItem', content: [p(text('Kuchen'))] }]
		})
	);
	assert.equal(result.ok, true);
});

test('news: headings, quotes, code and rules are rejected', () => {
	for (const node of [
		{ type: 'heading', attrs: { level: 2 }, content: [text('Titel')] },
		{ type: 'blockquote', content: [p(text('Zitat'))] },
		{ type: 'codeBlock', content: [text('x')] },
		{ type: 'horizontalRule' }
	]) {
		assert.deepEqual(parseRichText('news', doc(node)), { ok: false, reason: 'schema' });
	}
});

// ---- wiki profile and Markdown export (slice 6b) ------------------------------

test('wiki: quotes, rules and code blocks are allowed, h1 is not', () => {
	assert.equal(
		parseRichText(
			'wiki',
			doc({ type: 'blockquote', content: [p(text('Zitat'))] }, { type: 'horizontalRule' })
		).ok,
		true
	);
	assert.deepEqual(
		parseRichText('wiki', doc({ type: 'heading', attrs: { level: 1 }, content: [text('X')] })),
		{ ok: false, reason: 'schema' }
	);
});

test('toMarkdown: headings, marks, links, nested lists, quotes, code', () => {
	const md = toMarkdown(
		doc(
			{ type: 'heading', attrs: { level: 2 }, content: [text('Schlüssel')] },
			p(
				text('Liegt '),
				text('im Büro', [{ type: 'bold' }]),
				text(', siehe '),
				text('Plan', [{ type: 'link', attrs: { href: 'https://b-side.ms/plan' } }]),
				text(' (*nicht* weitergeben)')
			),
			{
				type: 'bulletList',
				content: [
					{ type: 'listItem', content: [p(text('eins'))] },
					{
						type: 'listItem',
						content: [
							p(text('zwei')),
							{
								type: 'orderedList',
								attrs: { start: 1 },
								content: [{ type: 'listItem', content: [p(text('a'))] }]
							}
						]
					}
				]
			},
			{ type: 'blockquote', content: [p(text('Zitat'))] },
			{ type: 'codeBlock', attrs: { language: null }, content: [text('npm i')] }
		) as RichTextDoc,
		'Haus'
	);
	assert.equal(
		md,
		[
			'# Haus',
			'',
			'## Schlüssel',
			'',
			'Liegt **im Büro**, siehe [Plan](https://b-side.ms/plan) (\\*nicht\\* weitergeben)',
			'',
			'- eins',
			'- zwei',
			'',
			'  1. a',
			'',
			'> Zitat',
			'',
			'```',
			'npm i',
			'```',
			''
		].join('\n')
	);
});
