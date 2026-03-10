<script setup lang="ts">
import Navigation from '../components/navigation.vue';

</script>

<template>
  <Navigation />

  <div class="page">
    <h1>VTerm Showcase</h1>
    <p>A terminal UI framework for building TUI apps with Vue SFCs, CSS, and flexbox.</p>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1;
  margin-top: 1;
  height: 100%;
  overflow-y: scroll;
}

h1 {
  color: cyan;
}

h2 {
  color: white;
}


.item {
  display: flex;
  flex-direction: row;
  gap: 2;
}

.label {
  color: cyan;
  width: 16;
}
</style>
