<script setup lang="ts">
const supabase = useSupabaseClient();
const { public: { baseUrl } } = useRuntimeConfig()
const { error } = await supabase.auth.signInWithOAuth({
    provider: 'keycloak',
    options: {
        scopes: 'openid profile email commonsdb_roles',
        redirectTo: `http://localhost:3000/oauth/callback`,
    }
})
</script>

<template>
    <div class="container">
        <p>Du wirst zum B-Side-Login weitergeleitet...</p>
    </div>
</template>