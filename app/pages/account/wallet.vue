<script setup lang="ts">
const { fetchWallet, walletTransactions } = useUser()
await fetchWallet();
</script>
<template>
    <Container>
        <Headline>Reprostunden-Konto</Headline>
        <div class="flex flex-col gap-4">
            <dl>
                <WalletBalance />
            </dl>
            <WalletTransactionList v-if="walletTransactions?.length" :transactions="walletTransactions" />
            <div v-else>
                <p class="text-sm">Noch keine Transaktionen auf diesem Stundenkonto.</p>
            </div>
        </div>
    </Container>
</template>