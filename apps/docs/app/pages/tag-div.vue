<template>
    <div class="content">
        <Header description="The generic container for flow content.">
            &lt;div&gt;: The Content Division element
        </Header>

        <div class="section">
            <h2>Description</h2>
            <p>The &lt;div&gt; element is the generic container for flow content.
                It has no effect on the content or layout until styled using CSS.</p>
        </div>

        <div class="section">
            <h2>Attributes</h2>
            <p>This element only includes the global attributes.</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
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
</style>
