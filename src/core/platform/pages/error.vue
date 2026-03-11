<template>
    <div class="container">
        <div class="error-header">
            <p class="error-title">VTerm Runtime Error</p>
            <p class="error-source" v-if="error?.source">in {{ error.source }}</p>
        </div>
        <div class="error-body">
            <p class="error-message">{{ error?.message }}</p>
            <div class="error-stack" v-if="stackLines.length > 0">
                <p v-for="(line, i) in stackLines" :key="i" class="stack-line">{{ line }}</p>
            </div>
        </div>
        <div class="error-footer">
            <button @press="dismiss">Dismiss</button>
        </div>
    </div>
</template>

<script setup lang="ts">
const router = inject(Symbol.for('vterm-router'))

const error = computed(() => vtermError.value)

const stackLines = computed(() => {
    const stack = error.value?.stack
    if (!stack) return []
    return stack.split('\n').filter((line) => line.trim()).slice(0, 20)
})

const dismiss = () => {
    clearVTermError()
    if (router) (router as any).push('/')
}
</script>

<style scoped>
.container {
    margin: 1 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow-y: scroll;
}

.error-header {
    margin-bottom: 1;
    width: 100%;
}

.error-title {
    color: white;
}

.error-source {
    color: white;
}

.error-message {
    color: red;
}

.error-stack {
    margin: 1 0;
}

.stack-line {
    color: lightgrey;
}

button {
    background: blue;
    color: white;
}

button:hover {
    background: blueviolet;
}
</style>
