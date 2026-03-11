<template>
    <div class="content">
        <Header description="An inline container for text. Partial support — renders but does not flow inline." :supported="false">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <p>Text with a <span class="highlight">highlighted span</span> inside.</p>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<span />'

const attrs = [
    {
        name: 'class',
        type: 'string',
        description: 'Apply CSS color or style to a portion of text. Inline flow within a paragraph is not yet supported — span renders as a block.',
        example: '<span class="highlight">text</span>',
    },
]

const example = `<template>
    <!-- Known limitation: span renders as a block, not inline.
         Inline text flow within paragraphs is not yet implemented. -->
    <p>Text with a <span class="highlight">span</span> inside.</p>
</template>

<style scoped>
.highlight { color: yellow; }
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

.highlight { color: yellow; }
</style>
