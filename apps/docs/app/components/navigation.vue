<template>
    <div class="nav-container">
        <div class="left-nav">
            <a href="/">VTERM</a>
        </div>

        <div class="right-nav">
            <button @click="sidebar.state.value.page === 'html'">HTML</button>
            <button @click="sidebar.set('css')">CSS</button>
        </div>
    </div>
</template>

<script setup lang="ts">
const sidebar = useSidebar()

</script>

<style lang='scss' scoped>
.nav-container {
    display: flex;
    width: 100%;
    gap: 2;
}

.left-nav {
    width: 5;
}

.right-nav {
    display: flex;
    justify-content: flex-end;
    gap: 2;
    width: 100%;
}
</style>