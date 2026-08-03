<script setup lang="ts">
const title = usePageTitle();
title.value = "Qualifikationen"
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
                    <li>Liste der Qualifikationen die man erwerben kann</li>
                    <li>Nachste Termine für Quali</li>
                    <li>Workshops für Qualifikationen können angefragt werden (Interessensbekundung)</li>
                    <li>Admins: Qualifikationen anlegen, Qualifikationen bearbeiten (inkl. nächter Terminbekundung),
                        Anfragen einsehen</li>
                </ul>
            </div>
        </div>
        <div class="col-span-full md:col-span-3">
        </div>
    </div>
</template>