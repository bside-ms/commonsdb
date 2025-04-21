<script setup lang="ts">
const { fetchWallet, wallet } = useUser()
await fetchWallet();

const { data } = await useFetch(`/api/wallets/${wallet.value?.id}/transactions`);
const transactions = computed(() => data.value?.items)
const totalCount = computed(() => data.value?.totalCount ?? 0)

const title = usePageTitle();
title.value = "Dein Reprostunden-Konto"
useSeoMeta({
    title
})
</script>
<template>
    <div class="flex flex-col gap-4">
        <dl>
            <WalletBalance :wallet-balance="wallet?.balance ?? 0" />
        </dl>
        <WalletTransactionList v-if="transactions?.length" :transactions="transactions" />
        <div v-else>
            <p class="text-sm">Noch keine Transaktionen auf diesem Stundenkonto.</p>
        </div>
    </div>
</template>