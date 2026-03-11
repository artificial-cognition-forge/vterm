<template>
    <div class="content">
        <Header description="A thematic break rendered as a full-width horizontal line." :supported="false">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <p>Content above</p>
            <hr>-</hr>
            <p>Content below</p>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<hr />'

const attrs = [
    {
        name: '(children)',
        type: 'string',
        description: 'The character to repeat across the full width. Defaults to - when no content is provided. e.g. <hr>─</hr> renders a full row of ─.',
        example: '<hr>─</hr>',
    },
]

const example = `<template>
    <p>Content above</p>

    <!-- Default dash fill -->
    <hr>-</hr>

    <!-- Custom character -->
    <hr>─</hr>
</template>`
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
</style>
