import { tv, type VariantProps } from '../utils.ts';

/**
 * Tones are named by meaning, not colour, so the mapping to task status
 * lives in one place (the route or a small status→tone helper later).
 * Four tones is one over the three-value rule. Open for discussion; status
 * badges seem to genuinely need them.
 */
export const badge = tv({
	base: 'inline-block border px-1.5 py-0.75 text-caps leading-none whitespace-nowrap',
	variants: {
		tone: {
			neutral: 'border-neutral-fill bg-neutral-fill text-ink', // Entwurf, archiviert
			attention: 'border-accent bg-accent text-ink', // dringend, offen
			success: 'border-area-commons bg-area-commons text-ink', // bestätigt
			info: 'border-area-init bg-area-init text-ink' // gemeldet
		},
		outline: {
			true: 'border-ink bg-paper'
		}
	},
	defaultVariants: { tone: 'neutral' }
});

export type BadgeVariants = VariantProps<typeof badge>;
