<template>
  <div class="container">
    <h1>Textarea Scroll Debug</h1>
    <p class="instructions">Scroll your mouse wheel over the textarea below</p>

    <!-- Debug info -->
    <div class="debug-info">
      <p>Lines: {{ lineCount }} | ContentHeight: {{ contentHeight }}</p>
      <p class="highlight">⚠️ If ScrollY doesn't change when you scroll, it's a bug</p>
    </div>

    <!-- Textarea -->
    <textarea
      ref="textareaRef"
      v-model="text"
      class="text-box"
      placeholder="Scroll with mouse wheel here..."
    />

    <!-- Status display -->
    <div class="status">
      <p v-if="scrolling" class="scroll-active">🔄 SCROLLING IN PROGRESS...</p>
      <p v-else class="scroll-inactive">⏸️ Not scrolling</p>
    </div>

    <p class="footer">Press Ctrl+C to exit</p>
  </div>
</template>

<script setup lang="ts">
const text = ref(`Line 1: Test scrolling
Line 2: Try mouse wheel
Line 3: up and down
Line 4: or use arrow keys
Line 5:
Line 6: Lorem ipsum dolor sit amet
Line 7: consectetur adipiscing elit
Line 8: sed do eiusmod tempor
Line 9: incididunt ut labore
Line 10: et dolore magna aliqua
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
Line 25: deserunt mollit anim`)

const lineCount = computed(() => text.value.split('\n').length)
const contentHeight = ref(0)
const scrolling = ref(false)
const textareaRef = ref()

// Update contentHeight when text changes
watch(() => text.value, () => {
  contentHeight.value = text.value.split('\n').length
})

// Monitor scroll wheel events
const onWheel = () => {
  scrolling.value = true
  setTimeout(() => { scrolling.value = false }, 300)
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

h1 {
  color: cyan;
  margin: 0;
  padding: 0;
}

.instructions {
  color: gray;
  margin: 0;
}

.debug-info {
  background: #1a1a1a;
  border: 1px solid yellow;
  padding: 1;
  color: yellow;
}

.debug-info p {
  margin: 0;
  padding: 0;
}

.highlight {
  color: red;
  font-weight: bold;
}

.text-box {
  flex: 1;
  width: 70;
  border: 2px solid white;
  color: white;
  background: #0a0a0a;
  padding: 1;
  min-height: 10;
}

.status {
  background: #1a1a1a;
  border: 1px solid blue;
  padding: 1;
  color: blue;
}

.status p {
  margin: 0;
  padding: 0;
}

.scroll-active {
  color: brightgreen;
  font-weight: bold;
}

.scroll-inactive {
  color: gray;
}

.footer {
  color: gray;
  margin: 0;
}
</style>
