<script lang="ts">
	import { KeyRound } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { Button, Card, Checkbox, EmptyState, toast } from '#lib/ui';
	import { adminsWithCapabilities, allCategories, saveCapabilities } from './capabilities.remote';

	const admins = $derived(await adminsWithCapabilities());
	const groups = $derived(await allCategories());
</script>

<svelte:head><title>{m.admin_capabilities_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.admin_capabilities_title()}</h1>
<p class="mt-3 max-w-2xl text-muted">{m.admin_capabilities_intro()}</p>

{#if admins.length === 0}
	<EmptyState class="mt-6" icon={KeyRound} title={m.admin_capabilities_empty()} />
{:else}
	<div class="mt-6 grid gap-6">
		{#each admins as admin (admin.id)}
			{@const f = saveCapabilities.for(admin.id)}
			<Card title={admin.name}>
				<form
					{...f.enhance(async ({ submit }) => {
						if (await submit()) toast(m.admin_capabilities_saved({ name: admin.name }));
					})}
					class="grid gap-5"
				>
					<input {...f.fields.userId.as('hidden', admin.id)} />
					<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{#each groups as group (group.id)}
							<fieldset class="grid content-start gap-2">
								<legend class="mb-2 text-tiny font-semibold">{group.name}</legend>
								{#each group.categories as c (c.id)}
									<Checkbox
										{...f.fields.categoryIds.as('checkbox', c.id, admin.categoryIds.includes(c.id))}
										label={c.name}
									/>
								{/each}
							</fieldset>
						{/each}
					</div>
					<div>
						<Button type="submit" size="sm" disabled={f.pending > 0}>
							{m.admin_capabilities_save()}
						</Button>
					</div>
				</form>
			</Card>
		{/each}
	</div>
{/if}
