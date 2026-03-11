<template>
    <div class="content">
        <Header description="An unordered list of items, rendered with bullet points." :supported="true">
            &lt;ul&gt;
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <ul>
                <li>Apples</li>
                <li>Oranges</li>
                <li>Bananas</li>
            </ul>
            <ul>
                <li>Nested list
                    <ul>
                        <li>Item A</li>
                        <li>Item B</li>
                    </ul>
                </li>
                <li>Back to top level</li>
            </ul>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const attrs = [
    {
        name: 'type',
        type: 'string',
        description: 'Marker style for list items. Not widely supported — prefer CSS list-style-type.',
        example: '<ul type="disc" />',
    },
]

const example = `<template>
    <ul>
        <li>Apples</li>
        <li>Oranges</li>
        <li>Bananas</li>
    </ul>

    <ul>
        <li>Nested list
            <ul>
                <li>Item A</li>
                <li>Item B</li>
            </ul>
        </li>
    </ul>
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
