<script setup lang="ts">
const title = usePageTitle();
title.value = "Ressourcen"
useSeoMeta({
    title
})
</script>

<template>
    <div class="grid gap-6 grid-cols-12">
        <div class="space-y-3 col-span-full lg:col-span-9">
            <div class="prose">
                <p>
                    Was es hier bald zu sehen gibt:
                </p>
                <ul>
                    <li>Deine nächsten Termine (persönlich und deiner Inis)</li>
                    <li>Buchung Wizard
                        <ul>
                            <li>Was willst du buchen? (Raum, Almende-Küche, Rad)</li>
                            <li>Für wen? - Ini oder persönlich (nicht bei Lastenrad, da das nur persönlich geht)</li>
                            <li>Wann? (Kalender zeigen)</li>
                            <li>Buchungsübersicht und Abschluss</li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
        <div class="col-span-full md:col-span-3">
        </div>
    </div>
</template>