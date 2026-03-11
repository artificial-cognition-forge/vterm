<template>
    <div class="nav-container">
        <div class="left-nav">
            <a href="/">VTERM</a>
        </div>

        <div class="right-nav">
            <button @click="sidebar.state.value.page === 'vue'">VUE</button>
            <button @click="sidebar.state.value.page === 'html'">HTML</button>
            <button @click="sidebar.set('css')">CSS</button>
        </div>
    </div>
</template>

<script setup lang="ts">
const sidebar = useSidebar()
</script>

<style scoped lang="scss">
.nav-container {
    display: flex;
    justify-content: space-between;
    width: 100%;
    border: 1px solid white;
    gap: 2;
}

.left-nav {
    width: 5;
}

.right-nav {
    display: flex;
    justify-content: flex-end;
    gap: 2;
    width: 25;
}

button {
    width: 10;
}
</style>