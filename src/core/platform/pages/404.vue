<template>
    <main>
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <button @press="goHome">Go Home</button>
    </main>
</template>

<script setup lang="ts">
import { useRouter } from "~/router"

const router = useRouter()

const goHome = () => {
    router.push("/")
}
</script>

<style scoped>
main {
    padding: 20px;
    text-align: center;
}

h1 {
    color: red;
    margin-bottom: 10px;
}

p {
    color: white;
    margin-bottom: 20px;
}

button {
    background: blue;
    color: white;
    border: 1px solid white;
    padding: 5px 10px;
}

button:hover {
    background: brightblue;
}
</style>
