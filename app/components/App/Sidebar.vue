<template>
    <Sidebar class="border-none pb-4">
        <SidebarContent>
            <SidebarHeader>
                <SidebarMenu>
                    <!-- Brand -->
                    <SidebarMenuItem>
                        <NuxtLink to="/" class="flex items-center gap-2 pb-5 px-2 rounded-md hover:bg-sidebar-accent group">
                            <span class="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-secondary dark:bg-secondary-foreground">
                                <Icon name="lucide:zap" class="h-4 w-4" />
                            </span>
                            <span class="font-semibold tracking-tight text-sm group-data-[collapsible=icon]:hidden">
                                <span>Your</span>
                                <span class="text-primary ml-[2px]">App</span>
                            </span>
                        </NuxtLink>
                    </SidebarMenuItem>
                </SidebarMenu>
                <!-- Mobile search bar -->
                <div class="md:hidden px-2 pb-2">
                    <div class="relative">
                        <Icon name="lucide:search" class="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search..." class="pl-9" />
                    </div>
                </div>
            </SidebarHeader>

            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarGroupLabel>Navigation</SidebarGroupLabel>

                        <!-- Home -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path === '/'">
                                <NuxtLink to="/" class="flex items-center gap-2">
                                    <Icon name="lucide:home" /> Home
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- Dashboard -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path.startsWith('/dashboard')">
                                <NuxtLink to="/dashboard" class="flex items-center gap-2">
                                    <Icon name="lucide:layout-dashboard" /> Dashboard
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton size="lg" class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                                <Avatar class="h-8 w-8 rounded-lg">
                                    <AvatarFallback class="rounded-lg">
                                        {{ usernameInitials || "?" }}
                                    </AvatarFallback>
                                </Avatar>
                                <div class="grid flex-1 text-left text-sm leading-tight">
                                    <span class="truncate font-semibold">{{ username || "Loading..." }}</span>
                                    <span class="truncate text-xs text-muted-foreground">{{ userEmail || "" }}</span>
                                </div>
                                <Icon name="mdi:chevron-up" class="ml-auto size-4" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="top" class="w-[--reka-popper-anchor-width] min-w-56" align="end" :sideOffset="4">
                            <DropdownMenuLabel class="p-0 font-normal">
                                <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar class="h-8 w-8 rounded-lg">
                                        <AvatarFallback class="rounded-lg">
                                            {{ usernameInitials || "?" }}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div class="grid flex-1 text-left text-sm leading-tight">
                                        <span class="truncate font-semibold">{{ username || "Loading..." }}</span>
                                        <span class="truncate text-xs text-muted-foreground">{{ userEmail || "" }}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem @click="navigateTo('/settings')">
                                <Icon name="lucide:settings" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Icon name="lucide:palette" />
                                    Theme
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem @click="userStore.setTheme('light')">
                                        <Icon name="lucide:sun" />
                                        Light
                                        <Icon v-if="theme === 'light'" name="lucide:check" class="ml-auto" />
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="userStore.setTheme('dark')">
                                        <Icon name="lucide:moon" />
                                        Dark
                                        <Icon v-if="theme === 'dark'" name="lucide:check" class="ml-auto" />
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Icon name="lucide:languages" />
                                    Language
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem>
                                        <Icon name="lucide:check" class="mr-2" />
                                        English
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled>
                                        <span class="ml-6">Spanish</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled>
                                        <span class="ml-6">French</span>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Icon name="lucide:help-circle" />
                                    Help
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem @click="navigateTo('/help/contact')">
                                        <Icon name="lucide:mail" />
                                        Contact Support
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="navigateTo('/help/tutorials')">
                                        <Icon name="lucide:graduation-cap" />
                                        Tutorials
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem @click="userStore.signout">
                                <Icon name="lucide:log-out" />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>

                <!-- Mobile trigger -->
                <SidebarMenuItem class="flex items-center justify-center md:hidden">
                    <SidebarTrigger />
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
</template>

<script setup>
const userStore = useUserStore()
const route = useRoute()

// User computed properties
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

const userEmail = computed(() => {
    return userStore.userProfile?.email || ''
})

const theme = computed(() => userStore.theme)

onMounted(() => {
    if (!userStore.userProfile) {
        userStore.fetchUserProfile()
    }
})
</script>
