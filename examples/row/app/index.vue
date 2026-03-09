<template>
  <div class="container">
    <div class="row">
      <h1>Flexbox Row 1000</h1>
      <p>1000 flex items</p>
      <div class="item" v-for="item in 1000" :key="item">{{ padstart(item, 4) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// padstart 0001
const padstart = (num: number, targetLength: number) => {
  const str = num.toString();
  return targetLength > str.length ? new Array(targetLength - str.length + 1).join('0') + str : str;
};
</script>

<style scoped>
.container {
  width: 100%;
  overflow-y: scroll;
}

.row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
  gap: 1;
  height: 100%;
}

.item {
  width: 4;
  height: 1;
  background: red;
}

.item:hover {
  background: rgb(202, 82, 73);
}
</style>