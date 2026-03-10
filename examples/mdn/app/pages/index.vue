<template>
  <div class="content">
    <h1>Welcome to MDN</h1>
    <p>Select an HTML element from the sidebar to learn more.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default"
}) 
</script>

<style scoped>
.content {
  width: 100%;
  height: 100%;
  padding: 1 2;
}

h1 {
  margin-bottom: 1;
}
</style>
