<template>
  <div class="container">
    <h1>Mouse Blocking Demo</h1>
    <p class="instructions">
      This demo shows proper pointer-events layering. The overlay in front blocks
      mouse wheel scroll on the scrollable container behind it.
    </p>

    <!-- Background scrollable container -->
    <div class="background">
      <h2>Scrollable Background</h2>
      <p v-for="i in 30" :key="i" class="item">Line {{ i }}: Scroll me when not under overlay</p>
    </div>

    <!-- Absolutely positioned overlay (blocks interaction on background) -->
    <div class="overlay">
      <h3>Overlay (blocks scroll)</h3>
      <p>Scroll wheel here won't scroll background</p>
    </div>

    <!-- Example with pointer-events: none (allows click-through) -->
    <div class="container-right">
      <div class="background-right">
        <h2>Background (Right)</h2>
        <p v-for="i in 20" :key="i" class="item">Item {{ i }}</p>
      </div>

      <div class="transparent-overlay">
        <p>This overlay has pointer-events: none</p>
        <p>Scroll works through it!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  gap: 1;
  padding: 1;
}

h1 {
  color: cyan;
  margin: 0 0 1 0;
}

.instructions {
  color: gray;
  margin: 0 0 1 0;
}

.background {
  position: relative;
  width: 48%;
  height: 20;
  overflow: scroll;
  border: 1px solid blue;
  z-index: 1;
}

.background h2 {
  color: blue;
  margin: 0;
}

.item {
  margin: 0;
  padding: 0;
}

.overlay {
  position: absolute;
  top: 5;
  left: 2;
  width: 30;
  height: 8;
  background: yellow;
  color: black;
  border: 1px solid black;
  z-index: 10;
  padding: 1;
}

.overlay h3 {
  color: black;
  margin: 0 0 1 0;
}

.overlay p {
  color: black;
  margin: 0;
}

.container-right {
  position: absolute;
  top: 5;
  right: 2;
  width: 40%;
  height: 20;
  display: flex;
  flex-direction: column;
}

.background-right {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: scroll;
  border: 1px solid green;
  z-index: 1;
}

.background-right h2 {
  color: green;
  margin: 0;
  font-size: 1;
}

.transparent-overlay {
  position: absolute;
  top: 3;
  left: 2;
  width: 20;
  height: 4;
  background: cyan;
  color: black;
  border: 1px solid gray;
  z-index: 100;
  pointer-events: none;
  padding: 1;
}

.transparent-overlay p {
  color: black;
  margin: 0;
  font-size: 0.8;
}
</style>
