<template>
    <header class="shadow-md">
        <Container>
            <nav class="flex items-center justify-between py-4">
                <div class="flex items-center gap-6">
                    <Button variant="ghost" as-child>
                        <NuxtLink to="/account" class="flex items-center gap-2">
                            <Logo class="w-6" />
                            <div class="font-serif text-base">CommonsDb</div>
                        </NuxtLink>
                    </Button>
                    <LayoutAppNavigation />
                </div>
                <div>
                    <UserNavigation />
                </div>
            </nav>
        </Container>
    </header>
</template>