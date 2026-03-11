<template>
    <div class="sidebar">
        <!-- <a class="logo" href="/">Vterm</a> -->

        <div class="links" v-if="sidebar.page.value === 'html'">
            <h2>HTML</h2>
            <a :href="link.url" v-for="link in sidebarHtml.links">
                <code lang="html">{{ link.name }}</code>
            </a>
        </div>

        <div class="links">
            <h2>CSS</h2>
            <a :href="link.url" v-for="link in sidebarCss.links">
                <code lang="typescript">{{ link.name }}</code>
            </a>
        </div>

        <div class="links">
            <h2>VUE</h2>
            <a :href="link.url" v-for="link in sidebarVue.links">
                <code lang="vue">{{ link.name }}</code>
            </a>
        </div>

        <div class="links">
            <h2>VTERM</h2>
            <a :href="link.url" v-for="link in sidebarVterm.links">
                <code lang="vue">{{ link.name }}</code>
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSidebar } from '../composables/useSidebar';

const sidebar = useSidebar()

const sidebarVterm= ref({
    links: {
    }
})
const sidebarVue= ref({
    links: {
        color: {
            name: "<div v-if />",
            url: "property-color"
        },

        "vfor": {
            name: "<div v-for />",
            url: "property-opacity"
        },

        "vshow": {
            name: "<div v-show />",
            url: "property-opacity"
        },
    }
})

const sidebarCss = ref({
    links: {
        color: {
            name: "color",
            url: "property-color"
        },

        opacity: {
            name: "opacity",
            url: "property-opacity"
        },

        background: {
            name: "background",
            url: "property-background"
        },

        border: {
            name: "border",
            url: "property-border"
        },

        margin: {
            name: "margin",
            url: "property-margin"
        },

        padding: {
            name: "padding",
            url: "property-padding"
        },

        width: {
            name: "width",
            url: "property-width"
        },
        
        height: {
            name: "height",
            url: "property-height"
        },

        display: {
            name: "display",
            url: "property-display"
        },

        flex: {
            name: "flex",
            url: "property-flex"
        },

        justify: {
            name: "justify",
            url: "property-justify"
        },

        align: {
            name: "align",
            url: "property-align"
        },

        position: {
            name: "position",
            url: "property-position"
        },

        top: {
            name: "top",
            url: "property-top"
        },

        bottom: {
            name: "bottom",
            url: "property-bottom"
        },

        left: {
            name: "left",
            url: "property-left"
        },

        right: {
            name: "right",
            url: "property-right"
        },

        "z-index": {
            name: "z-index",
            url: "property-z"
        },
    }
})

const sidebarHtml = ref({
    links: {
        a: {
            name: "<a/>",
            hover: "<a />",
            url: "tag-a"
        },

        hr: {
            name: "<hr/>",
            hover: "<hr />",
            url: "tag-div"
        },
        div: {
            name: "<div/>",
            hover: "<div />",
            url: "tag-div"
        },

        ul: {
            name: "<ul/>",
            hover: "<ul />",
            url: "tag-div"
        },

        li: {
            name: "<li/>",
            hover: "<li />",
            url: "tag-div"
        },

        p: {
            name: "<p/>",
            hover: "<p />",
            url: "tag-div"
        },

        h: {
            name: "<h1/>",
            hover: "<h1 />",
            url: "tag-div"
        },

        nav: {
            name: "<nav/>",
            hover: "<nav />",
            url: "tag-div"
        },

        ol: {
            name: "<ol/>",
            hover: "<ol />",
            url: "tag-div"
        },

        table: {
            name: "<table/>",
            hover: "<table />",
            url: "tag-div",
            supported: false,
        },

        input: {
            name: "<input/>",
            hover: "<input />",
            url: "tag-input"
        },

        textarea: {
            name: "<textarea/>",
            hover: "<textarea />",
            url: "tag-textarea"
        },

        span: {
            name: "<span/>",
            hover: "<span />",
            url: "tag-span"
        },

        code: {
            name: "<code/>",
            hover: "<code />",
            url: "tag-code"
        },

        section: {
            name: "<section/>",
            hover: "<section />",
            url: "tag-section"
        },

        main: {
            name: "<main/>",
            hover: "<main />",
            url: "tag-main"
        },

        html: {
            name: "<html/>",
            hover: "<html />",
            url: "tag-html"
        },
    }
})
</script>

<style lang='scss' scoped>
.sidebar {
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    width: 20;
}

.links {
    margin-top: 1;
    text-decoration: none;
}

a {
    text-decoration: none;
        margin-left: 0;

    &:hover {
        background: rgb(40, 39, 39);
        margin-left: 1;
    }

    &:active {
        background: rgb(30, 29, 29);
    }
}

.logo {
    text-decoration: none;
    margin-bottom: 1;
}
</style>