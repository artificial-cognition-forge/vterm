<template>
  <div class="content">
    <h1>Welcome to MDN</h1>
    <p>Select an HTML element from the sidebar to learn more.</p>

    <button @click="() => { throw new Error('hello') }">throw error</button>
    <a href="/unknown-page">404</a>
  </div>
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

.content {
  width: 100%;
  height: 100%;
  padding: 1 2;
  overflow-y: scroll;
}

h1 {
  margin-bottom: 1;
}
</style>
