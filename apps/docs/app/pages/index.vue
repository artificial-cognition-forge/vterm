<template>
    <h1>Welcome to MDN</h1>
    <p>Select an HTML element from the sidebar to learn more.</p>

    <button @click="() => { throw new Error('hello') }">throw error</button>
    <a href="/unknown-page">404</a>
</template>

<script setup lang="ts">
const router = useRouter()
definePageMeta({
  layout: "default"
}) 
</script>

<style scoped>
.sidebar {
  background: red;
}

h1 {
  margin-bottom: 1;
}
</style>
