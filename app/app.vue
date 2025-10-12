<template>
  <Toaster />
  <NuxtLayout class="bg-background">
    <NuxtPwaManifest />
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
import gsap from "gsap";
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'


</script>

<style scoped>
.layout-enter-active,
.layout-leave-active,
.page-enter-active,
.page-leave-active {
  transition: all 1s;
}

.layout-enter-from,
.layout-leave-to,
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>