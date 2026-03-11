<template>
    <div class="content">
        <Header description="A list item inside a ul or ol element." :supported="true">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <ul>
                <li>First item</li>
                <li>Second item</li>
                <li class="highlight">Styled item</li>
            </ul>
            <ol>
                <li>Step one</li>
                <li>Step two</li>
                <li>Step three</li>
            </ol>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<li />'

const attrs = [
    {
        name: 'value',
        type: 'number',
        description: 'Sets the ordinal value of the item inside an ol. Subsequent items count from this value.',
        example: '<li value="3">Item starting at 3</li>',
    },
]

const example = `<template>
    <ul>
        <li>First item</li>
        <li>Second item</li>
        <li class="highlight">Styled item</li>
    </ul>

    <ol>
        <li>Step one</li>
        <li>Step two</li>
    </ol>
</template>

<style scoped>
.highlight { color: cyan; }
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

.highlight { color: cyan; }
</style>
