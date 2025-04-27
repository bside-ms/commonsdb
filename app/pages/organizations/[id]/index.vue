<script setup lang="ts">
import type { Organization, OrganizationMember } from '~/types/organizations';
import type { User } from '~/types/users';
import type { Wallet, WithBalance } from '~/types/wallets';

const { id } = useRoute().params

const { data: organization } = await useFetch<Organization & { wallet: Wallet & WithBalance, members: (OrganizationMember & { user: User })[] }>(`/api/organizations/${id}`)

const title = usePageTitle();
title.value = organization.value?.name ? `Initiative: ${organization.value.name}` : "Initiative"
useSeoMeta({
    title
})
</script>

<template>
    <div v-if="organization" class="grid gap-6 lg:grid-cols-12">
        <div class="lg:col-span-8">
            <OrganizationInfo :organization="organization" />
        </div>
        <div class="grid gap-6 lg:col-start-9 lg:col-span-4">
            <div>
                <Box title="Nächste Termine">
                    {{ $t("organizations.bookings.none") }}
                </Box>
            </div>
            <div>
                <Box title="Reprostundenkonto">
                    <WalletBalance :wallet-balance="organization?.wallet.balance ?? 0" />
                </Box>
            </div>
            <div>
                <Box title="Member">
                    <div v-if="organization?.members?.length" class="flex flex-wrap gap-y-2 gap-x-6">
                        <UserListItem v-for="{ user } in organization?.members" :user="user" />
                    </div>
                    <p v-else>
                        {{ $t("organizations.member.none") }}
                    </p>
                </Box>
            </div>
            <OrganizationViewActions :organization="organization" />
        </div>
    </div>
    <div v-else>
        Could not load organization data.
    </div>
</template>