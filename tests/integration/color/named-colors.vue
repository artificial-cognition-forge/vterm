<template>
  <div class="container">
    <div class="red">red</div>
    <div class="blue">blue</div>
    <div class="cyan">cyan</div>
    <div class="green">green</div>
    <div class="yellow">yellow</div>
    <div class="magenta">magenta</div>
    <div class="white">white</div>
    <div class="black" style="background: white">black</div>
    <div class="brightred">brightred</div>
    <div class="brightgreen">brightgreen</div>
  </div>
</template>

<script setup></script>

<style scoped>
.container {
  width: 40;
  height: 20;
  display: flex;
  flex-direction: column;
}

div {
  width: 40;
  height: 1;
  background: grey;
}

.red { color: red; }
.blue { color: blue; }
.cyan { color: cyan; }
.green { color: green; }
.yellow { color: yellow; }
.magenta { color: magenta; }
.white { color: white; }
.black { color: black; }
.brightred { color: brightred; }
.brightgreen { color: brightgreen; }
</style>
