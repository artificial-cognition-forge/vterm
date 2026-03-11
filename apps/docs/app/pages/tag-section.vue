<template>
    <div class="content">
        <Header description="A generic semantic section of a document." :supported="true">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <section class="demo-section">
                <h2>Introduction</h2>
                <p>Sections group related content. They behave identically to div in vterm.</p>
            </section>
            <section class="demo-section">
                <h2>Details</h2>
                <p>Use sections to add semantic structure to your layout.</p>
            </section>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<section />'

const attrs = [
    {
        name: 'class',
        type: 'string',
        description: 'Apply CSS for layout and spacing. Behaves identically to div in vterm.',
        example: '<section class="panel">...</section>',
    },
]

const example = `<template>
    <section class="panel">
        <h2>Introduction</h2>
        <p>Sections group related content.</p>
    </section>

    <section class="panel">
        <h2>Details</h2>
        <p>Use sections for semantic structure.</p>
    </section>
</template>

<style scoped>
.panel { margin-bottom: 1; }
</style>`
</script>

<style scoped lang="scss">
.content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 1 2;
    overflow-y: scroll;
}

.demo-section {
    margin-bottom: 1;
}
</style>
