import { watch } from 'vue'

export default defineNuxtPlugin(() => {
  const userStore = useUserStore()

  const apply = () => {
    const isDark = userStore.theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
  }

  // apply on load
  apply()

  // react to changes
  watch(() => userStore.theme, () => apply(), { immediate: false })
})
