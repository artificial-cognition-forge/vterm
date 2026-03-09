<template>
    <div class="vterm-nav">
        <input type="text" v-model="vtermNavInput" />
        <button @click="nav">Search</button>
    </div>

    {{ vtermNavInput }}

    <div class="spacer"></div>

    <div class="vterm-debugger">
        <div class="tabs">
            <button>Console</button>
            <button>???</button>
        </div>
    </div>
</template>

<script setup lang="ts">
const router = useRouter()
const vtermNavInput = ref("hey")

function nav() {
    router.navigate(vtermNavInput.value)
}
</script>

<style scoped>
.vterm-nav {
    background: white;
    display: flex;
}

.vterm-debugger {
    background: white;
    height: 3;
}

.spacer {
    flex: 1;
}
</style>
