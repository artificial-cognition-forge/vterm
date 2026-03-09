<template>
  <div class="container">
    <div class="header">
      <h1>Textarea Scroll Test</h1>
      <p>Try scrolling with your mouse wheel inside the textarea below</p>
    </div>

    <textarea
      v-model="text"
      class="text-box"
      placeholder="Type or scroll here with mouse wheel..."
    />

    <div class="footer">
      <p>Lines: {{ lineCount }} | ScrollY: {{ scrollY }}</p>
      <p>Press Ctrl+C to exit</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const text = ref(`Line 1: Welcome to VTerm
Line 2: This is a textarea
Line 3: Try scrolling with mouse wheel
Line 4: Or use arrow keys to navigate
Line 5: The scrollbar should appear on the right
Line 6:
Line 7: Lorem ipsum dolor sit amet
Line 8: consectetur adipiscing elit
Line 9: sed do eiusmod tempor incididunt
Line 10: ut labore et dolore magna aliqua
Line 11:
Line 12: Ut enim ad minim veniam
Line 13: quis nostrud exercitation
Line 14: ullamco laboris nisi
Line 15: ut aliquip ex ea commodo
Line 16:
Line 17: Duis aute irure dolor
Line 18: in reprehenderit in voluptate
Line 19: velit esse cillum dolore
Line 20: eu fugiat nulla pariatur
Line 21:
Line 22: Excepteur sint occaecat
Line 23: cupidatat non proident
Line 24: sunt in culpa qui officia
Line 25: deserunt mollit anim id est laborum`)

const lineCount = computed(() => text.value.split('\n').length)

// Track scrollY for debugging
let scrollY = ref(0)
const updateScrollY = () => {
  // We can't directly read scrollY from textarea, but we can see it in console logs
}
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

.header {
  flex-shrink: 0;
}

h1 {
  color: cyan;
  margin: 0;
  padding: 0;
  font-weight: bold;
}

p {
  color: gray;
  margin: 0;
  padding: 0;
}

.text-box {
  flex: 1;
  border: 2px solid yellow;
  color: white;
  background: #0a0a0a;
  padding: 1;
  min-height: 10;
}

.footer {
  flex-shrink: 0;
  border-top: 1px solid blue;
  padding-top: 1;
}

.footer p {
  color: brightgreen;
  margin: 0;
  padding: 0;
  font-weight: bold;
}
</style>
