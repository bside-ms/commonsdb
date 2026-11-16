/**
 * URL slug from a title: lower case, German umlauts spelled out, other
 * accents dropped, anything else becomes '-'. "Schlüssel & Türen" →
 * "schluessel-tueren". Never empty.
 */
export function slugify(title: string): string {
	const s = title
		.toLowerCase()
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
		.replace(/-+$/, '');
	return s || 'seite';
}
