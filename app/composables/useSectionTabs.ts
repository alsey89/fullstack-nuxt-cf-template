import { computed } from 'vue'
import { useRoute } from 'vue-router'

export type SectionTab = {
  label: string
  to: string
  icon?: string
}

type SectionConfig = {
  id: string
  matchers: string[]
  tabs: SectionTab[]
}

// Central mapping for sidebar collapsible sections -> page tabs
const sections: SectionConfig[] = [
  {
    id: 'companySettings',
    matchers: ['/admin/company'],
    tabs: [
      { label: 'Company Info', to: '/admin/company', icon: 'lucide:info' },
      { label: 'Position Types', to: '/admin/company/position', icon: 'lucide:briefcase' },
      { label: 'Approval Rules', to: '/admin/company/workflow', icon: 'lucide:workflow' },
    ],
  },
  {
    id: 'helpCenter',
    matchers: ['/help'],
    tabs: [
      { label: 'Contact', to: '/help/contact', icon: 'lucide:mail' },
      { label: 'Tutorials', to: '/help/tutorials', icon: 'lucide:graduation-cap' },
    ],
  },
  {
    id: 'employeePay',
    matchers: ['/employee/pay'],
    tabs: [
      { label: 'Pay Information', to: '/employee/pay', icon: 'lucide:wallet' },
      { label: 'Request Pay Adjustments', to: '/employee/pay/adjustments', icon: 'lucide:edit' },
    ],
  },
  {
    id: 'employeeSchedule',
    matchers: ['/employee/availability'],
    tabs: [
      { label: 'Schedule', to: '/employee/availability/schedule', icon: 'lucide:calendar' },
      { label: 'Availability', to: '/employee/availability', icon: 'lucide:toggle-left' },
      { label: 'Schedule Requests', to: '/employee/availability/schedule-requests', icon: 'lucide:list-checks' },
      { label: 'Leave Requests', to: '/employee/availability/leave-requests', icon: 'lucide:plane' },
    ],
  },
]

function startsWithPath(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + '/')
}

export function useSectionTabs() {
  const route = useRoute()

  const currentSection = computed(() => {
    // Choose the section whose matcher is the longest prefix of the current path
    let best: { section: SectionConfig; prefixLen: number } | undefined
    for (const s of sections) {
      for (const m of s.matchers) {
        if (startsWithPath(route.path, m)) {
          const len = m.length
          if (!best || len > best.prefixLen) {
            best = { section: s, prefixLen: len }
          }
        }
      }
    }
    return best?.section
  })

  const tabs = computed<SectionTab[]>(() => currentSection.value?.tabs ?? [])

  const active = computed<string | undefined>(() => {
    const list: SectionTab[] = tabs.value
    if (!list.length) return undefined
    // Prefer exact match
    const exact = list.find((t: SectionTab) => route.path === t.to)
    if (exact) return exact.to
    // Otherwise choose the longest prefix match so deeper tabs (e.g., /company/position)
    // win over broader ones (e.g., /company)
    let best: { to: string; len: number } | undefined
    for (const t of list) {
      if (startsWithPath(route.path, t.to)) {
        const len = t.to.length
        if (!best || len > best.len) best = { to: t.to, len }
      }
    }
    return best?.to ?? list[0]?.to
  })

  return { tabs, active }
}
