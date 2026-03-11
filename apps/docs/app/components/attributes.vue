<template>
    <section class="attrs">
        <h2>Attributes</h2>
        <div class="attr-row" v-for="attr in attrs" :key="attr.name">
            <div class="attr-meta">
                <p class="attr-name">{{ attr.name }}</p>
                <p class="attr-type" v-if="attr.type">{{ attr.type }}</p>
            </div>
            <p class="attr-desc">{{ attr.description }}</p>
            <code v-if="attr.example" class="attr-example" lang="html">{{ attr.example }}</code>
        </div>
    </section>
</template>

<script setup lang="ts">
interface Attr {
    name: string
    type?: string
    description: string
    example?: string
}

defineProps<{ attrs: Attr[] }>()
</script>

<style scoped lang="scss">
.attrs {
    margin-bottom: 2;
}

h2 {
    color: cyan;
    margin-bottom: 1;
}

.attr-row {
    margin-bottom: 2;
}

.attr-meta {
    display: flex;
    gap: 2;
    margin-bottom: 1;
}

.attr-name {
    color: white;
}

.attr-type {
    color: lightgrey;
}

.attr-desc {
    color: lightgrey;
    margin-bottom: 1;
}

.attr-example {
    margin-left: 1;
}
</style>
