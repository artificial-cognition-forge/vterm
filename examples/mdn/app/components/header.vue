<template>
    <div class="header">
        <h1><slot /></h1>
        <p class="desc" v-if="description">{{ description }}</p>
    </div>
</template>

<script setup lang="ts">
defineProps<{ description?: string }>()
</script>

<style lang='scss' scoped>
.header {
    margin-bottom: 1;
}

.desc {
    color: lightgrey;
}
</style>