<script setup lang="ts">
const title = usePageTitle();
title.value = "Deine Initiativen"
useSeoMeta({
    title
})

const { status, data } = await useFetch('/api/users/me/organization-memberships', { server: false })
</script>
<template>
    <div class="grid gap-6 grid-cols-12">
        <div class="space-y-3 col-span-full lg:col-span-9">
            <UserOrganizationMembershipList :memberships="data" :loading="status === 'idle'" />
            <div class="mt-8 text-sm text-destructive">Todo: Paginierung</div>
        </div>
        <div class="col-span-full md:col-span-3">
            <OrganizationListActions />
        </div>
    </div>
</template>