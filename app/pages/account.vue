<script setup>
// Redirect account page to settings
definePageMeta({
  middleware: (to, from) => {
    return navigateTo('/settings', { redirectCode: 301 })
  }
})
</script>
