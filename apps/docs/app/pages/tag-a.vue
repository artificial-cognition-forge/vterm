<template>
    <div class="content">
        <Header description="Creates a hyperlink to web pages, files, or locations.">
            &lt;a&gt;: The Anchor element
        </Header>

        <div class="section">
            <h2>Description</h2>
            <p>The &lt;a&gt; element, with its href attribute, creates a hyperlink to destinations
                such as URLs, page sections, email addresses, or any URL-addressable resource.</p>
        </div>

        <div class="section">
            <h2>Attributes</h2>
            <div class="attr-row">
                <p class="attr-name">href</p>
                <p class="attr-desc">The URL or destination the link points to.</p>
            </div>
            <div class="attr-row">
                <p class="attr-name">target</p>
                <p class="attr-desc">Where to open the linked document (_blank, _self, etc).</p>
            </div>
            <div class="attr-row">
                <p class="attr-name">rel</p>
                <p class="attr-desc">Relationship between the current and linked document.</p>
            </div>
        </div>

        <div class="section">
            <h2>Example</h2>
            <code lang="html">{{ html }}</code>

            <a href="https://example.com">Visit Example</a>
        </div>
    </div>
</template>

<script setup lang="ts">
import Header from '../components/header.vue'
const html = ref("<a href=\"https://example.com\">Visit Example</a>")
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
    width: 10;
}

.attr-desc {
    color: lightgrey;
    width: 100%;
}
</style>
