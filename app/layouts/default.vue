<!-- layouts/default.vue -->
<template>
    <div class="bg-background flex h-screen overflow-x-hidden">
        <SidebarProvider>
            <AppSidebar />

            <main class="flex min-h-0 min-w-0 flex-1 flex-col">
                <!-- layout box -->
                <div class="flex h-full min-h-0 w-full flex-1 flex-col">
                    <!-- scroll area definition -->
                    <div class="h-full w-full flex-1 overflow-y-auto overscroll-y-contain">
                        <!-- content container -->
                        <div class="min-h-full w-full px-4 md:px-8 py-4 md:py-8">
                            <slot />
                        </div>
                    </div>
                </div>
            </main>
        </SidebarProvider>
    </div>
</template>

<script setup>
const userStore = useUserStore()

onMounted(() => {
    if (!userStore.userProfile) {
        userStore.fetchUserProfile()
    }
})
</script>
