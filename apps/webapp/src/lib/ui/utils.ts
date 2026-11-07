import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { createTV } from 'tailwind-variants/config';

/**
 * tailwind-merge only knows Tailwind's default theme. Our tokens.css wipes
 * the default colours and type scale and adds its own names, so without this
 * config `cn('text-h2', 'text-ink')` would treat both as the same group and
 * silently drop one. Keep these lists in sync with tokens.css.
 */
const twMergeConfig = {
	extend: {
		theme: {
			color: [
				'ink',
				'paper',
				'canvas',
				'muted',
				'placeholder',
				'hair',
				'accent',
				'hover',
				'hover-strong',
				'sunken',
				'neutral-fill',
				'selected',
				'danger',
				'notify',
				'success-line',
				'warning-soft',
				'white',
				'transparent',
				'current',
				'area-start',
				'area-tasks',
				'area-tasks-tile',
				'area-commons',
				'area-init',
				'area-qual'
			],
			text: [
				'caps',
				'tiny',
				'small',
				'button',
				'body',
				'h3',
				'h2',
				'stat',
				'h1',
				'saldo',
				'display'
			],
			radius: ['full']
		}
	}
};

const twMerge = extendTailwindMerge(twMergeConfig);

/** Join class values and resolve Tailwind conflicts (last one wins). */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/** `tv` bound to the same merge config, use this instead of importing from tailwind-variants. */
export const tv = createTV({ twMergeConfig });

export type { VariantProps } from 'tailwind-variants';
