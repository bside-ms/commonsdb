<script setup lang="ts">
const { walletBalance } = useUser()
</script>

<template>
    <div class="grid gap-6 lg:grid-cols-6">
        <Box title="Deine Aufgaben" class="col-span-full lg:col-span-4">
            <AccountTaskList />
        </Box>
        <Box title="Reprostunden" link="/wallet" class="col-span-full lg:col-span-2">
            <WalletBalance :wallet-balance="walletBalance" />
        </Box>
    </div>
</template>