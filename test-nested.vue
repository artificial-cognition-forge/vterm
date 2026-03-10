<template>
  <div class="root">
    <div class="content2">b</div>
    <div class="content">a</div>
  </div>
</template>

<script setup lang="ts">
// This should render two columns
</script>

<style scoped>
.root {
  width: 30;
  height: 24;
  display: flex;
  flex-direction: row;
  border: 1px solid cyan;
}

.content2 {
  width: 5;
  height: 100%;
  background: yellow;
  border: 1px solid red;
}

.content {
  width: 25;
  height: 100%;
  background: blue;
  border: 1px solid white;
}
</style>
