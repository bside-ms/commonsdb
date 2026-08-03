<script setup lang="ts">
const { wallet } = useUser()
</script>

<template>
    <div class="grid gap-6 lg:grid-cols-6">
        <div class="col-span-full lg:col-span-4">
            <Box title="Deine Aufgaben">
                <AccountTaskList />
            </Box>
        </div>
        <div class="col-span-full lg:col-span-2">
            <Box title="Reprostunden" link="/wallet">
                <WalletBalance :wallet-balance="wallet?.balance ?? 0" />
            </Box>
        </div>
    </div>
</template>