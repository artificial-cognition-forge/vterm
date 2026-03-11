<template>
    <div class="nav-container">
        <div class="left-nav">
            <a href="/">VTERM DOCS</a>
        </div>
    </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.nav-container {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid cyan;
}

.left-nav {
    width: 10;
}

.right-nav {
    display: flex;
    justify-content: flex-end;
    gap: 2;
    width: 25;
}

button {
    width: 10;
    background: red;
}
</style>