<template>
    <div class="container">
        <div>{{ ascii404 }}</div>
        <a href="/">Go to home</a>

    </div>
</template>

<script setup lang="ts">
const ascii404 = `404`
</script>

<style scoped>
.container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
}

p {
    color: white;
}

a {
    color: cyan;
}
</style>
