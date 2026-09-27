<script lang="ts">
    import {Select} from 'bits-ui';

    /**
     * Bits UI select. Replaces the native element so the category
     * picker can be typeahead-searchable later without changing
     * call sites.
     */
    type Option = { value: string; label: string };

    let {
        value = $bindable(''),
        options = [],
        placeholder = 'Bitte wählen',
        id,
        ...rest
    }: {
        value?: string;
        options?: Option[];
        placeholder?: string;
        id?: string;
    } & Record<string, unknown> = $props();

    const selected = $derived(options.find((o) => o.value === value)?.label ?? placeholder);
</script>

<Select.Root type="single" bind:value {...rest}>
    <Select.Trigger
            {id}
            class="control-base flex items-center justify-between gap-2 text-left data-placeholder:text-[#6f6f6f]"
    >
        {selected}
        <span aria-hidden="true" class="text-micro">▼</span>
    </Select.Trigger>

    <Select.Portal>
        <Select.Content
                class="z-50 max-h-64 w-[var(--bits-select-anchor-width)] overflow-y-auto bg-paper edge"
                sideOffset={-1}
        >
            <Select.Viewport>
                {#each options as option (option.value)}
                    <Select.Item
                            value={option.value}
                            label={option.label}
                            class="cursor-pointer px-[13px] py-2.5 text-small data-highlighted:bg-accent data-selected:font-semibold"
                    >
                        {option.label}
                    </Select.Item>
                {/each}
            </Select.Viewport>
        </Select.Content>
    </Select.Portal>
</Select.Root>