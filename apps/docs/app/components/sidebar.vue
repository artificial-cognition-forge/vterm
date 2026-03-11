<template>
    <div class="sidebar">
        <!-- <a class="logo" href="/">Vterm</a> -->

        <div class="links" v-if="sidebar.page.value === 'html'">
            <a :href="link.url" v-for="link in sidebarHtml.links">
                <div class="">hello</div>
                <!-- <code lang="html">{{ link.name }}</code> -->
            </a>
        </div>

        <div class="links" v-if="sidebar.page.value === 'css'">
            <a :href="link.url" v-for="link in sidebarCss.links">
                <div class="">hello</div>
                <code lang="typescript">{{ link.name }}</code>
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSidebar } from '../composables/useSidebar';

const sidebar = useSidebar()

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
            url: "tag-a"
        },

        div: {
            name: "<div/>",
            url: "tag-div"
        },

        input: {
            name: "<input />",
            url: "tag-input"
        },

        textarea: {
            name: "<textarea />",
            url: "tag-textarea"
        },

        span: {
            name: "<span />",
            url: "tag-span"
        },

        code: {
            name: "<code />",
            url: "tag-code"
        },

        section: {
            name: "<section />",
            url: "tag-section"
        },

        main: {
            name: "<main />",
            url: "tag-main"
        },

        html: {
            name: "<html />",
            url: "tag-html"
        },
    }
})
</script>

<style lang='scss' scoped>
.sidebar {
    display: flex;
    flex-direction: column;
    width: 15;
}

.links {
    margin-top: 1;
}

.logo {
    text-decoration: none;
}
</style>