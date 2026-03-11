<template>
    <section class="example-section">
        <div class="left">
            <h2>Example</h2>
            <code class="example-code" lang="html">{{ code }}</code>
        </div>
        <div class="right">
            <h2>Rendered</h2>
            <div class="example-rendered">
                <slot />
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
defineProps<{ code: string }>()
</script>

<style scoped lang="scss">
.example-section {
    display: flex;
    gap: 2;

    .left {
        width: 50%;
    }

    .right {
        width: 50%;
    }
}

h2 {
    color: cyan;
    margin-bottom: 1;
}
</style>
