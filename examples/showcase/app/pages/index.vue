<script setup lang="ts">
import Navigation from '../components/navigation.vue';

</script>

<template>
  <Navigation />

  <div class="page">
    <h1>VTerm Showcase</h1>
    <p>A terminal UI framework for building TUI apps with Vue SFCs, CSS, and flexbox.</p>

    <div class="section">
      <h2>Pages</h2>
      <div class="item">
        <p class="label">Layout</p>
        <p>Flexbox rows, columns, and wrapping</p>
      </div>
      <div class="item">
        <p class="label">Colors</p>
        <p>Named colors and background fills</p>
      </div>
      <div class="item">
        <p class="label">Reactive</p>
        <p>Counters, v-model, computed values</p>
      </div>
    </div>

    <div class="section">
      <h2>Stack</h2>
      <div class="item">
        <p class="label">Vue 3 SFCs</p>
        <p>Full script setup, refs, computed, watchers</p>
      </div>
      <div class="item">
        <p class="label">CSS</p>
        <p>Scoped styles, flexbox, colors, pseudo-classes</p>
      </div>
      <div class="item">
        <p class="label">Routing</p>
        <p>File-based routing with pages/</p>
      </div>
    </div>

    <div class="markdown">
    </div>

    <div class="section">
      <div>Highlighting</div>

      <div>
        <div>```typescript</div>
        <code lang="ts">console.log("hello")</code>
        <div>```</div>
      </div>
    </div>
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
