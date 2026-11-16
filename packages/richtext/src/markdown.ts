import type { JSONContent } from '@tiptap/core';
import type { RichTextDoc } from './index.ts';

/*
 * TipTap JSON → Markdown (CommonMark + ~~strike~~), for the wiki export
 * ("a space can move to Outline later", ARCHITECTURE.md). Covers the
 * nodes and marks our profiles allow; anything unknown falls back to its
 * text, so an export never fails.
 */

/** Characters that would start Markdown syntax in running text. */
const escapeText = (s: string) => s.replace(/([\\`*_[\]<>#|~])/g, '\\$1');

function inline(nodes: JSONContent[] = []): string {
	return nodes
		.map((n) => {
			if (n.type === 'hardBreak') return '\\\n';
			if (n.type !== 'text') return inline(n.content);
			const marks = n.marks ?? [];
			const isCode = marks.some((m) => m.type === 'code');
			let out = isCode ? '`' + (n.text ?? '').replace(/`/g, '\\`') + '`' : escapeText(n.text ?? '');
			for (const m of marks) {
				if (m.type === 'bold') out = `**${out}**`;
				else if (m.type === 'italic') out = `_${out}_`;
				else if (m.type === 'strike') out = `~~${out}~~`;
			}
			const link = marks.find((m) => m.type === 'link');
			if (link) out = `[${out}](${String(link.attrs?.href ?? '').replace(/\)/g, '%29')})`;
			return out;
		})
		.join('');
}

const indent = (text: string, prefix: string) =>
	text
		.split('\n')
		.map((line, i) => (i === 0 || line === '' ? line : prefix + line))
		.join('\n');

function block(n: JSONContent): string {
	switch (n.type) {
		case 'paragraph':
			return inline(n.content);
		case 'heading':
			return '#'.repeat(Number(n.attrs?.level ?? 2)) + ' ' + inline(n.content);
		case 'blockquote':
			return blocks(n.content)
				.split('\n')
				.map((l) => (l ? `> ${l}` : '>'))
				.join('\n');
		case 'codeBlock': {
			const code = (n.content ?? []).map((t) => t.text ?? '').join('');
			const fence = code.includes('```') ? '~~~' : '```';
			return `${fence}${n.attrs?.language ?? ''}\n${code}\n${fence}`;
		}
		case 'horizontalRule':
			return '---';
		case 'bulletList':
			return (n.content ?? []).map((li) => '- ' + indent(blocks(li.content), '  ')).join('\n');
		case 'orderedList': {
			const start = Number(n.attrs?.start ?? 1);
			return (n.content ?? [])
				.map((li, i) => {
					const marker = `${start + i}. `;
					return marker + indent(blocks(li.content), ' '.repeat(marker.length));
				})
				.join('\n');
		}
		default:
			return n.content ? blocks(n.content) : '';
	}
}

function blocks(nodes: JSONContent[] = []): string {
	return nodes
		.map(block)
		.filter((b) => b !== '')
		.join('\n\n');
}

/** A document as Markdown; `title` becomes the leading `# heading`. */
export function toMarkdown(doc: RichTextDoc | null, title?: string): string {
	const body = doc ? blocks(doc.content) : '';
	const head = title ? `# ${title}\n\n` : '';
	return `${head}${body}\n`;
}
