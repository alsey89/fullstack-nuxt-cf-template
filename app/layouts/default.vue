<!-- layouts/default.vue -->
<template>
    <div class="bg-background flex h-screen overflow-x-hidden">
        <SidebarProvider>
            <AppSidebar />

            <main class="flex min-h-0 min-w-0 flex-1 flex-col">
                <header
                    class="sticky top-0 z-50 border-b"
                    :style="{
                        background: 'var(--topnav-background)',
                    }"
                >
                <!-- boxShadow: 'var(--sidebar-shadow)',
                borderColor: 'var(--sidebar-border)' -->
                    <div class="w-full max-w-4xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
                        <SidebarTrigger class="md:hidden" />
                        <div class="flex-1 hidden md:block">
                            <div class="relative">
                                <Icon name="lucide:search" class="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="search" placeholder="Search..." class="pl-9 w-full" />
                            </div>
                        </div>
                        <div class="flex items-center gap-2 md:ml-auto">
                            <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="ghost" size="icon" aria-label="Notifications">
                                        <Icon name="lucide:bell" class="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Notifications
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Button variant="ghost" size="icon" aria-label="Settings" @click="navigateTo('/settings')">
                                        <Icon name="lucide:settings" class="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Settings
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <div>
                                        <AppThemeToggle />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Theme
                                </TooltipContent>
                            </Tooltip>
                            </TooltipProvider>
                            <!-- Spacer to reserve space for dropdown -->
                            <div class="sm:w-36 xl:hidden"></div>
                        </div>
                    </div>
                    <!-- User dropdown positioned at absolute right corner -->
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" class="absolute top-3 right-4 md:right-8 flex items-center gap-2">
                                <Avatar size="xs" class="w-6 h-6 rounded">
                                    <AvatarFallback class="text-primary bg-white rounded">
                                        {{ usernameInitials || "?" }}
                                    </AvatarFallback>
                                </Avatar>
                                <span class="hidden sm:inline text-sm font-semibold">
                                    {{ username || "Loading..." }}
                                </span>
                                <Icon name="mdi:chevron-down" class="text-primary" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" class="w-[--reka-popper-anchor-width]">
                            <DropdownMenuItem @click="navigateTo('/account')">
                                <span>Account</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem @click="userStore.signout">
                                <span>Sign out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                <!-- layout box -->
                <div class="flex h-full min-h-0 w-full flex-1 flex-col">
                    <!-- scroll area definition -->
                    <div class="h-full w-full flex-1 overflow-y-auto overscroll-y-contain">
                        <!-- content container with max width for better readability -->
                        <div class="min-h-full w-full max-w-4xl mx-auto px-4 md:px-8 py-4 md:py-8">
                            <slot />
                        </div>
                    </div>
                </div>
            </main>
        </SidebarProvider>
    </div>
</template>

<script setup>
import TooltipProvider from '@/components/ui/tooltip/TooltipProvider.vue'
const userStore = useUserStore()

const username = computed(() => {
    const p = userStore.userProfile
    if (!p) return ''
    const first = p.firstName || ''
    const last = p.lastName || ''
    return `${first} ${last}`.trim()
})

const usernameInitials = computed(() => {
    if (!username.value) return ''
    const parts = username.value.split(' ').filter(Boolean)
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0]
})

onMounted(() => {
    if (!userStore.userProfile) {
        userStore.fetchUserProfile()
    }
})
</script>
