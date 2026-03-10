<template>
  <div class="container">
    <Sidebar />
    <div class="content">content</div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '../components/sidebar.vue';
</script>

<style scoped>
.container {
  display: flex;
  height: 100%;
  width: 100%;
}

a:hover {
  color: blue;
}

h1 {
  margin-bottom: 1;
}


.content {
  width: 100%;
  height: 100%;
}
</style>
