<template>
    <nav class="nav">
        <p class="brand">vterm</p>
        <a href="/" class="link">home</a>
        <a href="/layout" class="link">layout</a>
        <a href="/colors" class="link">colors</a>
        <a href="/reactive" class="link">reactive</a>
    </nav>
</template>

<script setup lang="ts">

</script>

<style lang='scss' scoped>
.nav {
    display: flex;
    flex-direction: row;
    gap: 3;
    height: 1;
    background: #1e1e2e;
}

.brand {
    color: cyan;
    font-weight: bold;
}

.link {
    color: white;
}

.link:hover {
    color: cyan;
}

.content {
    flex: 1;
}
</style>