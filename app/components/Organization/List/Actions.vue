<script setup lang="ts">
const { isAdminUser } = useUser();

const onJoinOrganization = () => {
    alert('show qr code dialog')
}
</script>

<template>
    <div>
        <div class="grid gap-4">
            <Button @click="onJoinOrganization">
                {{ $t('organizations.actions.join') }}
            </Button>
            <template v-if="isAdminUser">
                <Button as-child>
                    <NuxtLink to="/organizations/create">{{ $t('organizations.actions.create') }}</NuxtLink>
                </Button>
            </template>
        </div>
    </div>
</template>