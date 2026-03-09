<template>
    <div class="container">
        <div class="inline">
            <div class="left">
                <div>inline left</div>
            </div>

            <div class="right">
                <div>inline</div>
                <div>inline</div>
                <div>inline</div>
            </div>
        </div>
        <div>div</div>
        <button @click="increment">button {{ buttonVal }}</button>
        <a href="">a</a>

        <input type="text" placeholder="hello" v-model="input" />

        <nav>
            <a href="">a</a>
            <a href="">a</a>
            <a href="">a</a>
            <a href="">a</a>
            <a href="">a</a>
        </nav>

        <h4>h4</h4>
        <h5>h5</h5>
        <h6>h6</h6>

        <hr />

        <code lang="typescript">
            function hello() { return "hello" } 
        </code>
        <code lang="typescript">
            type Hello = { a: "typescript" b: "type" }
        </code>

        <main>main</main>
        <header>header</header>
        <footer>footer</footer>
        <article>article</article>
        <section>section</section>

    </div>

    <div class="input-box">input</div>
</template>

<script setup lang="ts">
const input = ref("input")
const buttonVal = ref(0)
const increment = () => {
    buttonVal.value++
}
</script>

<style scoped>
.right {
    display: flex;
}

.container {
    display: flex;
    flex-direction: column;
    overflow: scroll;
    height: calc(100% - 4);
}

a:hover {
    background: grey;
}

nav {
    display: flex;
}

.inline {
    display: flex;
}

.input-box {
    background: red;
}
</style>
