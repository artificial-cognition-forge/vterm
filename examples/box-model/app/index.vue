<template>
  <div class="container">
    <h1 class="title">CSS Box Model</h1>

    <!-- Margin (not drawable, so represented as spacing) -->
    <div class="margin">
      <!-- Border -->
      <div class="border">
        <!-- Padding -->
        <div class="padding">
          <!-- Content -->
          <div class="content">
            CONTENT
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Box model visualisation
</script>

<style scoped>
.container {
  width: 100%;
  height: 100%;
}

.title {
  color: cyan;
  font-weight: bold;
  padding: 1;
}

/* Margin */
.margin {
  margin: 4;
  background: #222;
}

/* Border */
.border {
  border: 1px solid white;
  background: blue;
}

/* Padding */
.padding {
  padding: 3;
  background: magenta;
}

/* Content */
.content {
  width: 10;
  height: 4;
  background: yellow;
  color: black;
  text-align: center;
}
</style>