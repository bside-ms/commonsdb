<script setup lang="ts">
const { id } = useRoute().params

const { data: organization } = await useFetch(`/api/organizations/${id}`)

const title = usePageTitle();
title.value = organization.value?.name ? `Initiative: ${organization.value.name}` : "Initiative"
useSeoMeta({
    title
})
</script>

<template>
    <div class="grid gap-6 lg:grid-cols-12">
        <div class="lg:col-span-8">
            <OrganizationInfo :organization="organization" />
        </div>
        <OrganizationAdminActions :organization="organization" class="lg:col-span-4" />
        <div class="grid gap-6 lg:col-start-9 lg:col-span-4">
            <div>
                <Box title="Nächste Termine">
                    keine anstehende Termine
                </Box>
            </div>
            <div>
                <Box title="Reprostundenkonto">
                    <WalletBalance :wallet-balance="organization?.wallet.balance ?? 0" />
                </Box>
            </div>
            <div>
                <Box title="Member">
                    <div class="flex flex-wrap gap-y-2 gap-x-6">
                        <UserListItem v-for="{ user } in organization?.members" :user="user" />
                    </div>
                </Box>
            </div>
        </div>
    </div>
</template>