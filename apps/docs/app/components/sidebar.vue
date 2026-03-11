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
            <a :href="link.url" v-for="link in sidebarVue.links">
                <code lang="vue">{{ link.name }}</code>
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSidebar } from '../composables/useSidebar';

const sidebar = useSidebar()

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
    }
})

const sidebarHtml = ref({
    links: {
        a: {
            name: "<a/>",
            hover: "<a />",
            url: "tag-a"
        },

        div: {
            name: "<div/>",
            hover: "<div />",
            url: "tag-div"
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
}

.logo {
    text-decoration: none;
    margin-bottom: 1;
}
</style>