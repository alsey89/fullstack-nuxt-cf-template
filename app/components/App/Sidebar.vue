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

                        <!-- Settings -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path === '/settings'">
                                <NuxtLink to="/settings" class="flex items-center gap-2">
                                    <Icon name="lucide:settings" /> Settings
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- Help Center -->
                        <Collapsible v-model:open="helpOpen" class="group/collapsible md:hidden">
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <CollapsibleTrigger class="w-full flex items-center gap-2">
                                        <Icon name="lucide:help-circle" />
                                        Help Center
                                        <Icon name="mdi:chevron-down" class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                    </CollapsibleTrigger>
                                </SidebarMenuButton>
                                <CollapsibleContent v-auto-animate>
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/help/contact'">
                                                <NuxtLink to="/help/contact" class="flex items-center gap-2">
                                                    <Icon name="lucide:mail" /> Contact Support
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/help/tutorials'">
                                                <NuxtLink to="/help/tutorials" class="flex items-center gap-2">
                                                    <Icon name="lucide:graduation-cap" /> Tutorials
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                        <SidebarMenuItem class="hidden md:block">
                            <SidebarMenuButton asChild :isActive="route.path.startsWith('/help')">
                                <NuxtLink to="/help/contact" class="flex items-center gap-2">
                                    <Icon name="lucide:help-circle" />
                                    Help Center
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
</template>

<script setup>
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const userStore = useUserStore()
const route = useRoute()

// Section open states
const helpOpen = ref(false)

onMounted(() => {
    if (!userStore.userProfile) {
        userStore.fetchUserProfile()
    }
})
</script>
