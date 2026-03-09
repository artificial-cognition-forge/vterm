<template>
  <div class="page">
    <Navigation />

    <h1>Colors</h1>

    <h2>Named Colors</h2>
    <div class="swatches">
      <div class="swatch" v-for="c in namedColors" :key="c.name" :style="{ background: c.value }">
        <p>{{ c.name }}</p>
      </div>
    </div>

    <h2>Text Colors</h2>
    <div class="text-samples">
      <p class="c-red">red</p>
      <p class="c-green">green</p>
      <p class="c-blue">blue</p>
      <p class="c-cyan">cyan</p>
      <p class="c-yellow">yellow</p>
      <p class="c-white">white</p>
      <p class="c-grey">grey</p>
    </div>

    <h2>Hex Colors</h2>
    <div class="swatches">
      <div class="swatch" v-for="c in hexColors" :key="c.name" :style="{ background: c.value }">
        <p>{{ c.name }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Navigation from '../components/navigation.vue';

const namedColors = [
  { name: 'red', value: 'red' },
  { name: 'green', value: 'green' },
  { name: 'blue', value: 'blue' },
  { name: 'cyan', value: 'cyan' },
  { name: 'yellow', value: 'yellow' },
  { name: 'white', value: 'white' },
  { name: 'grey', value: 'grey' },
  { name: 'brightblue', value: 'brightblue' },
]

const hexColors = [
  { name: '#1e1e2e', value: '#1e1e2e' },
  { name: '#2a2a3e', value: '#2a2a3e' },
  { name: '#3a3a5e', value: '#3a3a5e' },
  { name: '#6c3483', value: '#6c3483' },
  { name: '#1a5276', value: '#1a5276' },
]
</script>

<style scoped>
.page {
  height: 100%;
  overflow-y: scroll;
}

h1 {
  color: cyan;
}

h2 {
  color: white;
  margin-top: 1;
}

.swatches {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1;
}

.swatch {
  width: 12;
  height: 2;
  color: white;
}

.text-samples {
  display: flex;
  flex-direction: row;
  gap: 2;
}

.c-red {
  color: red;
}

.c-green {
  color: green;
}

.c-blue {
  color: blue;
}

.c-cyan {
  color: cyan;
}

.c-yellow {
  color: yellow;
}

.c-white {
  color: white;
}

.c-grey {
  color: grey;
}
</style>
