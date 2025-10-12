<template>
    <div class="main-content p-4 text-sm text-muted-foreground">home page</div>
</template>

<script setup>
definePageMeta({
    title: 'Home',
    description: 'Home page',
    layout: 'default',
});
const userStore = useUserStore();
onMounted(() => {
    usePrimaryAnimation({ identifier: '.main-content' })
});
</script>