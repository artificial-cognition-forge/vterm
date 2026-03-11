<template>
    <div class="content">
        <Header description="Creates a hyperlink to other pages, routes, or external URLs." :supported="true">
            <code lang="vue">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <a href="/tag-div">Go to &lt;div&gt; page</a>
            <a href="https://vuejs.org">Open vuejs.org</a>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'


const el = '<a />'
const attrs = [
    {
        name: 'href',
        type: 'string',
        description: 'Internal path (e.g. "/settings") navigates via useRouter. External URLs (https://) open in the system browser.',
        example: '<a href="/settings">Settings</a>',
    },
]

const example = `<template>
    <!-- Internal navigation — same as router.push('/tag-div') -->
    <a href="/tag-div">Go to &lt;div&gt; page</a>

    <!-- External URL — opens in system browser -->
    <a href="https://vuejs.org">Open vuejs.org</a>
</template>

<!-- Programmatic navigation via useRouter() -->
<script setup>
const router = useRouter()
const go = () => router.push('/settings')
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
