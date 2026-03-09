<template>
  <div class="container">
    <h1>Textarea Scroll Test</h1>
    <p>Try scrolling with your mouse wheel inside the textarea below:</p>

    <textarea
      v-model="text"
      class="text-box"
      placeholder="Type or scroll here with mouse wheel..."
    />

    <p class="info">Lines in textarea: {{ lineCount }}</p>
    <p class="info">Press Ctrl+C to exit</p>
  </div>
</template>

<script setup lang="ts">
const text = ref(`Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7
Line 8
Line 9
Line 10
Line 11
Line 12
Line 13
Line 14
Line 15
Line 16
Line 17
Line 18
Line 19
Line 20
Line 21
Line 22
Line 23
Line 24
Line 25`)

const lineCount = computed(() => text.value.split('\n').length)
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 2;
  gap: 1;
}

h1 {
  color: cyan;
  margin: 0;
  padding: 0;
}

p {
  color: gray;
  margin: 0;
}

.text-box {
  width: 60;
  height: 12;
  border: 1px solid yellow;
  color: white;
  background: #0a0a0a;
  padding: 1;
}

.info {
  color: brightgreen;
  font-weight: bold;
}
</style>
