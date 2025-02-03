<script setup lang="ts">
import type { WalletTransaction } from '@prisma/client';


interface WalletTransactionListProps {
    transactions: WalletTransaction[]
}
defineProps<WalletTransactionListProps>()
</script>

<template>
    <div class="border-gray-400 border-t border-b">
        <ul class="divide-y divide-gray-300">
            <li v-for="transaction in transactions">
                <WalletTransactionListItem :transaction="transaction" />
            </li>
        </ul>
    </div>
</template>