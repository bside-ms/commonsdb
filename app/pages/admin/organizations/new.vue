<template>
    <div class="grid lg:grid-cols-6">
        <AdminOrganizationForm class="lg:col-span-3" @submit="navigateTo('/admin/organizations')"
            @cancel="navigateTo('/admin/organizations')" />
    </div>
</template>