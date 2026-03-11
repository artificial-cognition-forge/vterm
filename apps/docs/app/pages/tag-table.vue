<template>
    <div class="content">
        <Header description="Tabular data layout. Not supported in vterm — use div with flex instead." :supported="false">
            <code lang="html">{{ el }}</code>
        </Header>

        <Attributes :attrs="attrs" />

        <ExamplePanel :code="example">
            <p class="note">table is not supported. Use a flex-based layout to achieve the same result:</p>
            <div class="table-alt">
                <div class="row header-row">
                    <div class="cell">Name</div>
                    <div class="cell">Type</div>
                    <div class="cell">Default</div>
                </div>
                <div class="row">
                    <div class="cell">width</div>
                    <div class="cell">number</div>
                    <div class="cell">100%</div>
                </div>
                <div class="row">
                    <div class="cell">height</div>
                    <div class="cell">number</div>
                    <div class="cell">auto</div>
                </div>
            </div>
        </ExamplePanel>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
import Attributes from '../components/attributes.vue'
import ExamplePanel from '../components/example-panel.vue'

const el = '<table />'

const attrs = []

const example = `<!-- table is not supported. Use flex instead: -->
<template>
    <div class="table">
        <div class="row header">
            <div class="cell">Name</div>
            <div class="cell">Value</div>
        </div>
        <div class="row">
            <div class="cell">width</div>
            <div class="cell">100%</div>
        </div>
    </div>
</template>

<style scoped>
.table { display: flex; flex-direction: column; }
.row   { display: flex; }
.cell  { width: 20; }
.header .cell { color: cyan; }
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

.note {
    color: yellow;
    margin-bottom: 1;
}

.table-alt {
    display: flex;
    flex-direction: column;
}

.row {
    display: flex;
}

.header-row .cell {
    color: cyan;
}

.cell {
    width: 15;
}
</style>
