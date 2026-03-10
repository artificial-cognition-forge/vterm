<template>
    <div class="content">
        <Header description="Creates an interactive control for web-based forms.">
            &lt;input&gt;: The Input element
        </Header>

        <div class="section">
            <h2>Description</h2>
            <p>The &lt;input&gt; element is used to create interactive controls for web-based forms
                to accept data from the user.</p>
        </div>

        <div class="section">
            <h2>Attributes</h2>
            <div class="attr-row">
                <p class="attr-name">type</p>
                <p class="attr-desc">Controls the type of input (text, number, checkbox, etc).</p>
            </div>
            <div class="attr-row">
                <p class="attr-name">value</p>
                <p class="attr-desc">The initial value of the control.</p>
            </div>
            <div class="attr-row">
                <p class="attr-name">placeholder</p>
                <p class="attr-desc">Hint text shown when the field is empty.</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'

definePageMeta({
    layout: "default"
})
</script>

<style scoped>
.content {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 1 2;
}

.section {
    margin-bottom: 1;
}

h2 {
    color: cyan;
    margin-bottom: 1;
}

p {
    color: white;
}

.attr-row {
    display: flex;
    margin-bottom: 0;
}

.attr-name {
    color: yellow;
    width: 12;
}

.attr-desc {
    color: lightgrey;
    width: 100%;
}
</style>
