<template>
  <nav class="nav">
    <p class="brand">vterm</p>
    <a href="/" class="link">home</a>
    <a href="/layout" class="link">layout</a>
    <a href="/colors" class="link">colors</a>
    <a href="/reactive" class="link">reactive</a>
  </nav>

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
  </div>
</template>

<style scoped>
.page {
  margin-top: 5;
  height: 100%;
  overflow-y: scroll;
}

h1 {
  color: cyan;
}

h2 {
  color: white;
}

.section {
  margin-top: 1;
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
