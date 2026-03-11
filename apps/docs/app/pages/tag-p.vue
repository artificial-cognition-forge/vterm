<template>
    <div class="content">
        <Header description="A paragraph of text. Adds a line break after its content." :supported="true">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <p>This is a paragraph of text.</p>
            <p>This is a second paragraph. Each one starts on its own line.</p>
            <p class="styled">CSS applies normally — color, margin, padding.</p>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<p />'

const attrs = [
    {
        name: 'class',
        type: 'string',
        description: 'Apply scoped CSS classes for color, margin, padding, etc.',
        example: '<p class="muted">Some text</p>',
    },
]

const example = `<template>
    <p>This is a paragraph of text.</p>
    <p>This is a second paragraph.</p>
    <p class="styled">CSS applies normally.</p>
</template>

<style scoped>
.styled { color: cyan; margin-top: 1; }
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

.styled { color: cyan; }
</style>
