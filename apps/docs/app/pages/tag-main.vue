<template>
    <div class="content">
        <Header description="The dominant content of the document body. Only one per page." :supported="true">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <main class="demo-main">
                <h2>Main content area</h2>
                <p>In vterm, main behaves identically to div. Use it at the root of your page content.</p>
            </main>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<main />'

const attrs = [
    {
        name: 'class',
        type: 'string',
        description: 'Apply CSS for sizing and layout. Commonly set to width: 100%; height: 100%.',
        example: '<main class="app-body">...</main>',
    },
]

const example = `<template>
    <main class="app-body">
        <h1>Welcome</h1>
        <p>Main content goes here.</p>
    </main>
</template>

<style scoped>
.app-body {
    width: 100%;
    height: 100%;
    padding: 1 2;
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

.demo-main {
    border: 1px solid grey;
    padding: 1;
}
</style>
