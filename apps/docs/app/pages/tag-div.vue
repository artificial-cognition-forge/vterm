<template>
    <div class="content">
        <Header description="The generic container for flow content." :supported="true">
            <code lang="vue">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <div class="example-div">hello world</div>
            <div v-for="i in 5" class="example-div">{{ "No." + i }}</div>
            <div>
                <div class="example-div">nested</div>
                <div>
                    <div class="example-div">nested twice</div>
                </div>
            </div>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<div />'
const attrs = [
    {
        name: 'id',
        type: 'string',
        description: 'Unique identifier for the element.',
        example: '<div id="main" />',
    },
    {
        name: 'class',
        type: 'string',
        description: 'One or more CSS class names for styling.',
        example: '<div class="container" />',
    },
]

const example = `<template>
    <div>hello world</div>

    <div v-for="i in 5">
        {{ "No." + i }}
    </div>

    <div>
        <div>nested</div>
        <div>
            <div>nested twice</div>
        </div>
    </div>
</template>

<style scoped>
div:hover { background: grey; }
</style>`
</script>

<style scoped lang="scss">
.content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 1 2;
    margin: 1;
    overflow-y: scroll;
}

.example-div:hover {
    background: grey;
}
</style>
