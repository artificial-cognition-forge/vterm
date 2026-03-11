<template>
    <div class="container">
        <Navigation />
        <div class="layout">
            <Sidebar />
            <div class="content">
                <slot />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Navigation from '../components/navigation.vue';
import Sidebar from '../components/sidebar.vue'
</script>

<style scoped>
.container {
    display: flex;
    flex-direction: column;
    overflow-y: none;
    height: 100%;
    width: 100%;
}

.layout {
    display: flex;
    gap: 2;
    width: 100%;
    height: 100%;
    overflow-y: none;
}

.content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow-y: scroll;
}
</style>
