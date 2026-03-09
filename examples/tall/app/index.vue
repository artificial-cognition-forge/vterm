<template>
    <div class="container">
        <div class="items">
            <div class="item" v-for="value in 50">
                <p>
                    {{ value }} Lorem ipsum dolor sit amet consectetur adipisicing elit. Libero dignissimos est
                    libero delectus aut, consequatur explicabo eligendi exercitationem aliquid!
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
</script>

<style scoped>
.container {}

.items {
    overflow-y: scroll;
}
</style>
