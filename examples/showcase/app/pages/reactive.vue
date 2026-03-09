<script setup lang="ts">
import Navigation from '../components/navigation.vue'

// Counter
const count = ref(0)
const doubled = computed(() => count.value * 2)
const squared = computed(() => count.value * count.value)

// Text input
const text = ref('')
const upper = computed(() => text.value.toUpperCase())
const wordCount = computed(() => text.value.trim() === '' ? 0 : text.value.trim().split(/\s+/).length)

// Toggle
const active = ref(false)

// List
const items = ref(['apple', 'banana', 'cherry'])
const pool = ['mango', 'grape', 'lemon', 'peach', 'plum', 'kiwi', 'fig']
let poolIndex = 0
const addItem = () => {
  items.value.push(pool[poolIndex % pool.length])
  poolIndex++
}
const removeItem = () => {
  if (items.value.length > 0) items.value.pop()
}
</script>

<template>
  <div class="page">
    <Navigation />

    <h1>Reactive</h1>

    <h2>Counter</h2>
    <div class="row">
      <button @click="count--">-</button>
      <p class="count">{{ count }}</p>
      <button @click="count++">+</button>
    </div>
    <div class="row dim">
      <p>doubled: {{ doubled }}</p>
      <p>squared: {{ squared }}</p>
    </div>

    <h2>Text Input</h2>
    <input type="text" v-model="text" placeholder="type something..." />
    <p class="dim">words: {{ wordCount }}</p>
    <p v-if="text" class="upper">{{ upper }}</p>

    <h2>Toggle</h2>
    <div class="row">
      <button @click="active = !active">{{ active ? 'turn off' : 'turn on' }}</button>
      <p :class="active ? 'on' : 'off'">{{ active ? 'active' : 'inactive' }}</p>
    </div>

    <h2>List  <span class="dim">{{ items.length }} items</span></h2>
    <div class="row">
      <button @click="addItem">add</button>
      <button @click="removeItem">remove</button>
    </div>
    <div class="list">
      <p v-for="(item, i) in items" :key="i" class="list-item">
        <span class="dim">{{ i + 1 }}.</span> {{ item }}
      </p>
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
  gap: 2;
}

.count {
  color: cyan;
  font-weight: bold;
  width: 4;
}

.upper {
  color: cyan;
}

.dim {
  color: grey;
}

.on {
  color: green;
  font-weight: bold;
}

.off {
  color: grey;
}

.list {
  margin-top: 0;
}

.list-item {
  color: white;
}

button {
  color: white;
  background: #2a2a3e;
  width: 8;
}

button:hover {
  background: #3a3a5e;
}

input {
  width: 30;
}

span {
  color: grey;
}
</style>
