<template>
  <div class="container">
    <h1>Terminal State</h1>
    <div class="info">
      <p>Width: {{ terminal.width }}</p>
      <p>Height: {{ terminal.height }}</p>
    </div>
    <button @press="goBack">Back</button>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const terminal = useTerminal()

function goBack() {
  router.back()
}
</script>

<style scoped>
.container {
  padding: 2;
  display: flex;
  flex-direction: column;
  gap: 1;
}

h1 {
  color: cyan;
  margin: 0;
}

.info {
  color: white;
}

p {
  margin: 0;
  padding: 0;
}

button {
  background: blue;
  color: white;
  padding: 0 2;
  align-self: flex-start;
}

button:hover {
  background: brightblue;
}
</style>
