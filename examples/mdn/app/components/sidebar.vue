<template>
    <div class="sidebar">
        <a href="/">Vterm</a>

        <div class="links">
            <a :href="link.url" v-for="link in sidebar.links">{{ link.name }}</a>
        </div>
    </div>
</template>

<script setup lang="ts">

const sidebar = ref({
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
        }
    }
})
</script>

<style lang='scss' scoped></style>