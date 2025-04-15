<script setup lang="ts">
const { fetchWallet, walletBalance, walletTransactions } = useUser()
await fetchWallet();

const title = usePageTitle();
title.value = "Dein Reprostunden-Konto"
useSeoMeta({
    title
})
</script>
<template>
    <div class="flex flex-col gap-4">
        <dl>
            <WalletBalance :wallet-balance="walletBalance" />
        </dl>
        <WalletTransactionList v-if="walletTransactions?.length" :transactions="walletTransactions" />
        <div v-else>
            <p class="text-sm">Noch keine Transaktionen auf diesem Stundenkonto.</p>
        </div>
    </div>
</template>