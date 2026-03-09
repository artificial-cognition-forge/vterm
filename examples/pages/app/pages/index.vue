<template>
    <div>/</div>
    <a href="/">/</a>
    <a href="/hello">/hello</a>
    <a href="/world">/world</a>
</template>

<script setup lang="ts">
const router = useRouter()
const path = computed(() => router.currentPath.value)
</script>