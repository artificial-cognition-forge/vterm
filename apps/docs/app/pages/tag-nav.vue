<template>
    <div class="content">
        <Header description="A semantic container for navigation links." :supported="true">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <nav class="demo-nav">
                <a href="/tag-div">&lt;div&gt;</a>
                <a href="/tag-p">&lt;p&gt;</a>
                <a href="/tag-ul">&lt;ul&gt;</a>
            </nav>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<nav />'

const attrs = [
    {
        name: 'class',
        type: 'string',
        description: 'Use CSS to lay out links horizontally (flex) or vertically (flex-direction: column).',
        example: '<nav class="top-bar">...</nav>',
    },
]

const example = `<template>
    <nav class="top-bar">
        <a href="/home">Home</a>
        <a href="/settings">Settings</a>
    </nav>
</template>

<style scoped>
.top-bar {
    display: flex;
    gap: 2;
    border-bottom: 1px solid grey;
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

.demo-nav {
    display: flex;
    gap: 2;
}
</style>
