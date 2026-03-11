<template>
    <div class="content">
        <Header description="Displays preformatted code with syntax highlighting. Shiki-powered." :supported="true">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <code lang="typescript">const greeting = "hello world"</code>
            <code lang="html">&lt;div class="box"&gt;content&lt;/div&gt;</code>
            <code lang="vue">{{ vueSnippet }}</code>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<code />'
const vueSnippet = `<template>\n  <div>{{ msg }}</div>\n</template>`

const attrs = [
    {
        name: 'lang',
        type: 'string',
        description: 'The language for syntax highlighting. Accepts any Shiki-supported language token: typescript, html, vue, css, json, bash, etc.',
        example: '<code lang="typescript">const x = 1</code>',
    },
]

const example = `<template>
    <code lang="typescript">const x = 1</code>
    <code lang="html">&lt;div&gt;hello&lt;/div&gt;</code>
    <code lang="vue">{{ snippet }}</code>
</template>

<script setup>
const snippet = \`<template>
  <div>{{ msg }}</div>
</template>\`
<\/script>`
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
