<template>
    <div class="content">
        <Header description="A multi-line text input with scrolling and v-model support." :supported="true">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <textarea v-model="text" placeholder="Type something..." class="demo-textarea" />
            <p class="preview">Value: {{ text }}</p>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<textarea />'
const text = ref('')

const attrs = [
    {
        name: 'v-model',
        type: 'string',
        description: 'Two-way binding to a ref. Keeps the ref in sync as the user types.',
        example: '<textarea v-model="value" />',
    },
    {
        name: 'placeholder',
        type: 'string',
        description: 'Hint text shown when the textarea is empty.',
        example: '<textarea placeholder="Enter notes..." />',
    },
    {
        name: 'readonly',
        type: 'boolean',
        description: 'Prevents editing. Content is still selectable and scrollable.',
        example: '<textarea readonly />',
    },
]

const example = `<template>
    <textarea v-model="text" placeholder="Type something..." />
    <p>Value: {{ text }}</p>
</template>

<script setup>
const text = ref('')
<\/script>

<style scoped>
textarea {
    width: 100%;
    height: 8;
    border: 1px solid grey;
    padding: 1;
}
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

.demo-textarea {
    width: 100%;
    height: 6;
    border: 1px solid grey;
    padding: 1;
    margin-bottom: 1;
}

.preview {
    color: lightgrey;
}
</style>
