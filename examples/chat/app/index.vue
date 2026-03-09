<template>
  <div v-for="message in messages">{{ message }}</div>
  <input v-model="draft" type="text" class="input" />
  <button @click="send">send</button>
</template>

<script setup lang="ts">
const draft = ref("hello!")

function send() {
  messages.value.push(draft.value)
  draft.value = ""
}

throw new Error("")

const messages = ref<string[]>([])
</script>

<style scoped></style>
