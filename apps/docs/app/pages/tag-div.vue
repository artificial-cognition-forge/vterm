<template>
    <div class="content">
        <Header description="The generic container for flow content." :supported="true">
            <code lang="vue">{{ div }}</code>
        </Header>

        <section>
            <h2>Attributes</h2>

            <div v-for="attr in attrs">
                <h2>{{ attr.name }}</h2>
                <p>{{ attr.description }}</p>
                <code class="example-block" lang="vue">{{ attr.example }}</code>
            </div>
        </section>

        <section class="example-section">
            <div class="left">
                <h2>Example</h2>
                <code class="example-code" lang="vue">{{ example }}</code>
            </div>
            
            <div class="right">
                <h2>Rendered</h2>
                <div class="example-rendered">
                    <div class="example-div">hello world</div>
                    <div v-for="i in 5" class="example-div">{{ "No." + i }}</div>
                    <div>
                        <div class="example-div">nested</div>
                        <div>
                            <div class="example-div">nested twice</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
const div = "<div />"

const attrs = {
    name: {
        name: "Name",
        example: "<div name=\"hello\" />",
        description: "The name attribute specifies the name of the element."
    },

    id: {
        name: "Id",
        example: "<div id=\"hello\" />",
        description: "The id attribute specifies the identifier of the element."
    },
}

const example = `
<template>
    <div>hello world</div>

    <div v-for="i in 5">
        {{ "No." + i }}
    </div>
    
    <div>
        <div>nested</div>
        <div>
            <div>nested</div>
        </div>
    </div>
</template>

<style scoped>
div:hover {
    background: grey;
}
</style>
`
</script>

<style scoped lang="scss">

.content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 1 2;
}
.left {
    background: none;
}

.example-section {
    display: flex;

    .left {
        width: 50%;
    }

    .right {
        width: 50%;
    }

}

    .example-div:hover {
        background: grey;
    }


section {
    margin-bottom: 1;
}

h2 {
    color: cyan;
    margin-bottom: 1;
}

p {
    margin-bottom: 1;
    color: white;
}

.example-block {
    margin-bottom: 2;
}
</style>
