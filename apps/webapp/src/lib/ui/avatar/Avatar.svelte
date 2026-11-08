<!--
	@component
	Round avatar: photo if `src` is given, initials otherwise.
	Whether a photo may be shown (photo visibility) is decided by the caller.

	<Avatar name={profile.displayName} color="area-commons" />
	<Avatar name="Kim M." src={photoUrl} size="lg" />
-->
<script lang="ts">
	import { tv } from '../utils.ts';

	const avatar = tv({
		base: 'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink font-semibold text-ink select-none',
		variants: {
			size: {
				sm: 'size-(--avatar-sm) text-[0.625rem]',
				md: 'size-(--avatar-md) text-[0.75rem]',
				lg: 'size-(--avatar-lg) text-[1.0625rem]'
			},
			color: {
				'area-start': 'bg-area-start',
				'area-tasks': 'bg-area-tasks',
				'area-commons': 'bg-area-commons',
				'area-init': 'bg-area-init',
				'area-qual': 'bg-area-qual',
				neutral: 'bg-neutral-fill'
			}
		},
		defaultVariants: { size: 'md', color: 'neutral' }
	});

	type Color = 'area-start' | 'area-tasks' | 'area-commons' | 'area-init' | 'area-qual' | 'neutral';

	type Props = {
		/** Full display name. Used for initials and as the accessible name. */
		name: string;
		src?: string | null;
		size?: 'sm' | 'md' | 'lg';
		/** Omit for a stable colour derived from the name. */
		color?: Color;
		/** Set when the name is already visible next to the avatar. */
		decorative?: boolean;
		class?: string;
	};

	let { name, src, size, color, decorative = false, class: className }: Props = $props();

	const AREA_COLORS: Color[] = [
		'area-start',
		'area-tasks',
		'area-commons',
		'area-init',
		'area-qual'
	];

	const initials = $derived(
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('')
	);

	const autoColor = $derived.by(() => {
		let hash = 0;
		for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
		return AREA_COLORS[Math.abs(hash) % AREA_COLORS.length];
	});

	let failed = $state(false);
	$effect(() => {
		void src;
		failed = false;
	});
</script>

<span
	class={avatar({ size, color: color ?? autoColor, class: className })}
	role={decorative ? undefined : 'img'}
	aria-label={decorative ? undefined : name}
	aria-hidden={decorative || undefined}
>
	{#if src && !failed}
		<img {src} alt="" class="size-full object-cover" onerror={() => (failed = true)} />
	{:else}
		<span aria-hidden="true">{initials}</span>
	{/if}
</span>
