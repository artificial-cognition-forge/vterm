<template>
    <div class="header">
        <div class="title-row">
            <h1 class="tag"><slot /></h1>
            <p v-if="supported !== undefined" :class="supported ? 'badge-ok' : 'badge-no'">
                {{ supported ? '✓ Supported' : '✗ Not supported' }}
            </p>
        </div>
        <p class="desc" v-if="description">{{ description }}</p>
    </div>
</template>

<script setup lang="ts">
defineProps<{ description?: string; supported?: boolean }>()
</script>

<style lang='scss' scoped>
.header {
    margin-bottom: 2;
}

.title-row {
    display: flex;
    gap: 2;
}

h1 {
    color: cyan;
}

.desc {
    color: lightgrey;
    margin-top: 1;
}

.badge-ok {
    color: green;
}

.badge-no {
    color: red;
}
</style>
