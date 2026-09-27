<script lang="ts">
    /**
     * Initials on the person's stored colour, so the same person is
     * always the same colour. Decorative — the name is rendered
     * beside it in the layout, so this is aria-hidden.
     */
    type Colour = 'pink' | 'grass' | 'sky' | 'sun' | 'coral';

    let {
        name = '',
        colour = 'grass',
        size = 'md'
    }: { name?: string; colour?: Colour; size?: 'sm' | 'md' | 'lg' } = $props();

    const initials = $derived(
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0] ?? '')
            .join('')
            .toUpperCase()
    );

    const fills: Record<Colour, string> = {
        pink: 'bg-pink',
        grass: 'bg-grass',
        sky: 'bg-sky',
        sun: 'bg-sun',
        coral: 'bg-coral'
    };

    const sizes = {
        sm: 'size-[26px] text-[0.625rem]',
        md: 'size-[34px] text-micro',
        lg: 'size-[52px] text-h3'
    };
</script>

<span
        aria-hidden="true"
        class="flex flex-none items-center justify-center overflow-hidden rounded-full font-semibold edge {fills[
		colour
	]} {sizes[size]}">{initials}</span
>