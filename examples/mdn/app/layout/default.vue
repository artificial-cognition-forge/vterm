<template>
    <div class="layout">
        <Sidebar />
        <div class="content">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import Sidebar from '../components/sidebar.vue'
</script>

<style scoped>
.layout {
    display: flex;
    height: 100%;
    width: 100%;
}

.content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}
</style>
