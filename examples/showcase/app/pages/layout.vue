<script setup lang="ts">
import Navigation from '../components/navigation.vue';

</script>

<template>
  <div class="page">
    <Navigation />
    <h1>Layout</h1>

    <h2>Flex Row</h2>
    <div class="row">
      <div class="box red">A</div>
      <div class="box green">B</div>
      <div class="box blue">C</div>
      <div class="box yellow">D</div>
    </div>

    <h2>Flex Column</h2>
    <div class="col">
      <div class="box red">A</div>
      <div class="box green">B</div>
      <div class="box blue">C</div>
    </div>

    <h2>Justify Content</h2>
    <p>space-between</p>
    <div class="row-between">
      <div class="box red">1</div>
      <div class="box green">2</div>
      <div class="box blue">3</div>
    </div>
    <p>center</p>
    <div class="row-center">
      <div class="box red">1</div>
      <div class="box green">2</div>
      <div class="box blue">3</div>
    </div>

    <h2>Flex Wrap</h2>
    <div class="wrap">
      <div class="chip" v-for="n in 20" :key="n">item {{ n }}</div>
    </div>
  </div>
</template>

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

.row {
  display: flex;
  flex-direction: row;
  gap: 1;
}

.row-between {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
}

.row-center {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 2;
  width: 100%;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.wrap {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1;
  width: 100%;
}

.box {
  width: 6;
  height: 2;
}

.chip {
  width: 8;
  height: 1;
  background: #2a2a3e;
  color: white;
}

.chip:hover {
  background: #3a3a5e;
}

.red {
  background: red;
}

.green {
  background: green;
}

.blue {
  background: blue;
}

.yellow {
  background: yellow;
}
</style>
