<template>
    <Sidebar class="border-none pb-4">
        <SidebarContent>
            <SidebarHeader>
                <SidebarMenu>
                    <!-- Brand -->
                    <SidebarMenuItem>
                        <NuxtLink to="/" class="flex items-center gap-2 pb-5 px-2 rounded-md hover:bg-sidebar-accent group">
                            <span class="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-secondary dark:bg-secondary-foreground">
                                <Icon name="lucide:building-2" class="h-4 w-4" />
                            </span>
                            <span class="font-semibold tracking-tight text-sm group-data-[collapsible=icon]:hidden">
                                <span>Your</span>
                                <span class="text-primary ml-[2px]">App</span>
                            </span>
                        </NuxtLink>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <!-- User Type Switcher -->
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton>
                                    Role: {{ roleLabel }}
                                    <Icon name="mdi:chevron-down" class="text-primary" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent class="w-[--bits-dropdown-menu-anchor-width]">
                                <DropdownMenuItem @click="setRole('admin')">
                                    <span class="flex items-center gap-2">
                                        <Icon name="lucide:building" class="h-4 w-4" /> Admin
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem @click="setRole('manager')">
                                    <span class="flex items-center gap-2">
                                        <Icon name="lucide:briefcase" class="h-4 w-4" /> Manager
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem @click="setRole('employee')">
                                    <span class="flex items-center gap-2">
                                        <Icon name="lucide:user" class="h-4 w-4" /> Employee
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                    <SidebarMenu v-if="userStore.isAdmin">
                        <SidebarGroupLabel>Administrative</SidebarGroupLabel>
                        <!-- Company Settings -->
                        <Collapsible v-model:open="companySettingsOpen" class="group/collapsible md:hidden">
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <CollapsibleTrigger class="w-full flex items-center gap-2">
                                        <Icon name="lucide:building" />
                                        Company Settings
                                        <Icon name="mdi:chevron-down" class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                    </CollapsibleTrigger>
                                </SidebarMenuButton>
                                <CollapsibleContent v-auto-animate>
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/admin/company'">
                                                <NuxtLink to="/admin/company" class="flex items-center gap-2">
                                                    <Icon name="lucide:info" /> Company Info
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/admin/company/org'">
                                                <NuxtLink to="/admin/company/org" class="flex items-center gap-2">
                                                    <Icon name="lucide:network" /> Organization Structure
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/admin/company/profile'">
                                                <NuxtLink to="/admin/company/profile" class="flex items-center gap-2">
                                                    <Icon name="lucide:id-card" /> Profile Settings
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/admin/company/workflow'">
                                                <NuxtLink to="/admin/company/workflow" class="flex items-center gap-2">
                                                    <Icon name="lucide:workflow" /> Approval Rules
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/admin/company/position'">
                                                <NuxtLink to="/admin/company/position" class="flex items-center gap-2">
                                                    <Icon name="lucide:briefcase" /> Positions
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                        <SidebarMenuItem class="hidden md:block">
                            <SidebarMenuButton
                                asChild
                                :isActive="isCompanySettingsActive"
                            >
                                <NuxtLink to="/admin/company" class="flex items-center gap-2">
                                    <Icon name="lucide:building" />
                                    Company Settings
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- Staff Directory -->
                        <Collapsible v-model:open="staffOpen" class="group/collapsible md:hidden">
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <CollapsibleTrigger class="w-full flex items-center gap-2">
                                        <Icon name="lucide:users" />
                                        Staff Directory
                                        <Icon name="mdi:chevron-down" class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                    </CollapsibleTrigger>
                                </SidebarMenuButton>
                                <CollapsibleContent v-auto-animate>
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/admin/staff'">
                                                <NuxtLink to="/admin/staff" class="flex items-center gap-2">
                                                    <Icon name="lucide:user" /> Manage Staff
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/admin/staff/add'">
                                                <NuxtLink to="/admin/staff/add" class="flex items-center gap-2">
                                                    <Icon name="lucide:user-plus" /> Invite Staff
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>

                        <SidebarMenuItem class="hidden md:block">
                            <SidebarMenuButton asChild :isActive="isStaffDirectoryActive">
                                <NuxtLink to="/admin/staff" class="flex items-center gap-2">
                                    <Icon name="lucide:users" />
                                    Staff Directory
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- Simple Sections -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path === '/admin/jobs'">
                                <NuxtLink to="/admin/jobs" class="flex items-center gap-2">
                                    <Icon name="lucide:clipboard-list" /> Job Postings
                                    <span class="ml-auto text-xs text-muted-foreground">Coming soon</span>
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path === '/admin/revenue'">
                                <NuxtLink to="/admin/revenue" class="flex items-center gap-2">
                                    <Icon name="lucide:line-chart" /> Revenue
                                    <span class="ml-auto text-xs text-muted-foreground">Coming soon</span>
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path === '/admin/claims'">
                                <NuxtLink to="/admin/claims" class="flex items-center gap-2">
                                    <Icon name="lucide:file-text" /> Claims
                                    <span class="ml-auto text-xs text-muted-foreground">Coming soon</span>
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                    </SidebarMenu>

                    <!-- Manager Menu -->
                    <SidebarMenu v-if="userStore.isManager">
                        <SidebarGroupLabel>Management</SidebarGroupLabel>
                        <!-- Approvals Dashboard -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path === '/manager/approvals'">
                                <NuxtLink to="/manager/approvals" class="flex items-center gap-2">
                                    <Icon name="lucide:inbox" /> Approvals Dashboard
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- My Team -->
                        <Collapsible v-model:open="managerTeamOpen" class="group/collapsible md:hidden">
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <CollapsibleTrigger class="w-full flex items-center gap-2">
                                        <Icon name="lucide:users" /> My Team
                                        <Icon name="mdi:chevron-down" class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                    </CollapsibleTrigger>
                                </SidebarMenuButton>
                                <CollapsibleContent v-auto-animate>
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/manager/team'">
                                                <NuxtLink to="/manager/team" class="flex items-center gap-2">
                                                    <Icon name="lucide:user" /> Manage
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/manager/team/invite'">
                                                <NuxtLink to="/manager/team/invite" class="flex items-center gap-2">
                                                    <Icon name="lucide:user-plus" /> Invite
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                        <SidebarMenuItem class="hidden md:block">
                            <SidebarMenuButton asChild :isActive="route.path.startsWith('/manager/team')">
                                <NuxtLink to="/manager/team" class="flex items-center gap-2">
                                    <Icon name="lucide:users" />
                                    My Team
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- Work Schedules -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path.startsWith('/manager/schedule')">
                                <NuxtLink to="/manager/schedule" class="flex items-center gap-2">
                                    <Icon name="lucide:calendar" /> Work Schedules
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- Time Tracking -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path.startsWith('/manager/time')">
                                <NuxtLink to="/manager/time" class="flex items-center gap-2">
                                    <Icon name="lucide:clock" /> Time Tracking
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                    </SidebarMenu>

                    <!-- Employee Menu -->
                    <SidebarMenu v-if="userStore.isEmployee || userStore.isManager || userStore.isAdmin">
                        <SidebarGroupLabel v-if="!userStore.isEmployee">Personal</SidebarGroupLabel>
                        <!-- My Pay -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path.startsWith('/employee/pay')">
                                <NuxtLink to="/employee/pay" class="flex items-center gap-2">
                                    <Icon name="lucide:wallet" /> My Pay
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- My Schedule & Availability -->
                        <Collapsible v-model:open="employeeScheduleOpen" class="group/collapsible md:hidden">
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <CollapsibleTrigger class="w-full flex items-center gap-2">
                                        <Icon name="lucide:calendar-range" />
                                        My Schedule & Availability
                                        <Icon name="mdi:chevron-down" class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                    </CollapsibleTrigger>
                                </SidebarMenuButton>
                                <CollapsibleContent v-auto-animate>
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/employee/availability/schedule'">
                                                <NuxtLink to="/employee/availability/schedule" class="flex items-center gap-2">
                                                    <Icon name="lucide:calendar" /> Schedule
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/employee/availability'">
                                                <NuxtLink to="/employee/availability" class="flex items-center gap-2">
                                                    <Icon name="lucide:toggle-left" /> Availability Settings
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/employee/availability/schedule-requests'">
                                                <NuxtLink to="/employee/availability/schedule-requests" class="flex items-center gap-2">
                                                    <Icon name="lucide:list-checks" /> Schedule Requests
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild :isActive="route.path === '/employee/availability/leave-requests'">
                                                <NuxtLink to="/employee/availability/leave-requests" class="flex items-center gap-2">
                                                    <Icon name="lucide:plane" /> Leave Requests
                                                </NuxtLink>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                        <SidebarMenuItem class="hidden md:block">
                            <SidebarMenuButton
                                asChild
                                :isActive="route.path.startsWith('/employee/availability')"
                            >
                                <NuxtLink to="/employee/availability/schedule" class="flex items-center gap-2">
                                    <Icon name="lucide:calendar-range" />
                                    My Schedule & Availability
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- Clocking -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path.startsWith('/employee/clock')">
                                <NuxtLink to="/employee/clock" class="flex items-center gap-2">
                                    <Icon name="lucide:timer" /> Clocking
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- My Profile -->
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild :isActive="route.path.startsWith('/employee/profile')">
                                <NuxtLink to="/employee/profile" class="flex items-center gap-2">
                                    <Icon name="lucide:user-round" /> My Profile
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <!-- Help Center -->
                        <Collapsible v-model:open="employeeHelpOpen" class="group/collapsible md:hidden">
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

                    <div v-if="!userStore.isAdmin && !userStore.isManager && !userStore.isEmployee" class="p-4 text-sm text-muted-foreground">
                        Limited access view for {{ roleLabel }}.
                    </div>
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
const companySettingsOpen = ref(true)
const staffOpen = ref(true)
const helpOpen = ref(false)
// Manager sections
const managerTeamOpen = ref(true)
const managerHelpOpen = ref(false)
// Employee sections
const employeeScheduleOpen = ref(true)
const employeeHelpOpen = ref(false)

const roleLabel = computed(() => {
    const m = { admin: 'Admin', manager: 'Manager', employee: 'Employee' }
    return m[userStore.userType] || 'Admin'
})

function setRole(role) {
    userStore.setUserType(role)
}

const username = computed(() => userStore.userProfile?.firstName + ' ' + userStore.userProfile?.lastName)
const usernameInitials = computed(() => {
    if (!username.value) return ''
    const parts = username.value.split(' ')
    return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`
        : parts[0][0]
})

onMounted(() => {
    if (!userStore.userProfile) {
        userStore.fetchUserProfile()
    }
})

// Active-state helpers to avoid prefix overlaps on md+ single links
const isCompanySettingsActive = computed(() => route.path.startsWith('/admin/company'))
const isStaffDirectoryActive = computed(() => route.path.startsWith('/admin/staff'))
</script>