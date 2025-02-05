<template>
    <div class="grid lg:grid-cols-6">
        <AdminTaskForm class="lg:col-span-3" @submit="navigateTo('/admin/tasks')"
            @cancel="navigateTo('/admin/tasks')" />
    </div>
</template>