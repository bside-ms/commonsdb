<script setup lang="ts">
const { countdown, start } = useCountdown({
    timeInSeconds: 5,
    onFinish: () => {
        navigateTo("/")
    }
});

// onMounted(async () => {
//     useGqlToken(null);
//     await clear();
//     start()
// })
</script>
<template>
    <div>
        <h1>Erfolgreich ausgeloggt. Redirect in {{ countdown }} Sekunden.</h1>
    </div>
</template>