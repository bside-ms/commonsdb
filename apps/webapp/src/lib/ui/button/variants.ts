import { tv, type VariantProps } from '#lib/ui';

export const button = tv({
	base: [
		'inline-flex cursor-pointer items-center justify-center gap-2 border no-underline',
		'transition-colors disabled:cursor-not-allowed disabled:opacity-35',
		'aria-disabled:pointer-events-none aria-disabled:opacity-35'
	],
	variants: {
		/** primary = black, ghost = outline, accent = orange ("the active thing"). */
		variant: {
			primary: 'border-ink bg-ink text-paper hover:bg-ink/85',
			ghost: 'border-ink bg-transparent text-ink hover:bg-hover-strong',
			accent: 'border-ink bg-accent text-ink hover:bg-accent/85'
		},
		size: {
			md: 'min-h-(--touch-min) px-4.5 py-3 text-button',
			sm: 'px-3.25 py-2.5 text-small font-semibold'
		},
		/** Separate from variant so variant stays at three values. */
		tone: {
			default: '',
			danger: ''
		},
		block: {
			true: 'w-full'
		}
	},
	compoundVariants: [
		{ tone: 'danger', variant: 'primary', class: 'border-danger bg-danger hover:bg-danger/85' },
		{
			tone: 'danger',
			variant: ['ghost', 'accent'],
			class: 'border-danger bg-paper text-danger hover:bg-hover'
		}
	],
	defaultVariants: {
		variant: 'primary',
		size: 'md',
		tone: 'default'
	}
});

export type ButtonVariants = VariantProps<typeof button>;
