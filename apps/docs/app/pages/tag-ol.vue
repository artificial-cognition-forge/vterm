<template>
    <div class="content">
        <Header description="An ordered (numbered) list of items." :supported="true">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <ol>
                <li>Install vterm</li>
                <li>Create a .vue file</li>
                <li>Run vterm dev</li>
            </ol>
            <ol start="5">
                <li>Continuing from 5</li>
                <li>Then 6</li>
            </ol>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<ol />'

const attrs = [
    {
        name: 'start',
        type: 'number',
        description: 'The number to start counting from. Defaults to 1.',
        example: '<ol start="3">...</ol>',
    },
    {
        name: 'reversed',
        type: 'boolean',
        description: 'Counts down instead of up.',
        example: '<ol reversed>...</ol>',
    },
]

const example = `<template>
    <ol>
        <li>Install vterm</li>
        <li>Create a .vue file</li>
        <li>Run vterm dev</li>
    </ol>

    <ol start="5">
        <li>Continuing from 5</li>
        <li>Then 6</li>
    </ol>
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
