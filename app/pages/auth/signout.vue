<template>
    <div>

    </div>
</template>

<script setup>
const userStore = useUserStore();

onMounted(() => {
    userStore.signout();
});
</script>