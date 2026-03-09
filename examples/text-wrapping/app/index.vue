<template>
  <div class="container">
    <h1>Text Wrapping Demo</h1>
    <p class="intro">
      This demo shows CSS-compliant automatic text wrapping at container boundaries.
      Resize your terminal to see how text flows to the next line!
    </p>

    <!-- Normal text wrapping (white-space: normal) -->
    <div class="section">
      <h2>white-space: normal (default)</h2>
      <div class="box-normal">
        <p>
          Lorem ipsum dolor sit amet consectetur adipiscing elit. This is a long paragraph
          that will automatically wrap at word boundaries when it exceeds the container width.
          Multiple    spaces    and
          newlines are collapsed to single spaces like in CSS.
        </p>
      </div>
    </div>

    <!-- No wrapping (white-space: nowrap) -->
    <div class="section">
      <h2>white-space: nowrap</h2>
      <div class="box-nowrap">
        This text will not wrap no matter how long it is and will extend beyond container width
      </div>
      <p class="note">(text may extend beyond visible area)</p>
    </div>

    <!-- Preformatted (white-space: pre) -->
    <div class="section">
      <h2>white-space: pre</h2>
      <pre class="box-pre">
function fibonacci(n) {
  if (n &lt;= 1) return n
  return fibonacci(n-1) + fibonacci(n-2)
}
      </pre>
    </div>

    <!-- Pre-wrap (preserves formatting and wraps) -->
    <div class="section">
      <h2>white-space: pre-wrap</h2>
      <div class="box-prewrap">
This text preserves     spacing    and
also wraps at word boundaries when needed,
combining pre with automatic wrapping behavior.
      </div>
    </div>

    <!-- Implicit code element (white-space: pre by default) -->
    <div class="section">
      <h2>code element (implicit white-space: pre)</h2>
      <code class="box-code">
const greeting = "Hello, VTerm!"
console.log(greeting)
      </code>
    </div>

    <!-- Comparison: different widths -->
    <div class="section">
      <h2>Different widths</h2>
      <p class="label">Width: 40 characters</p>
      <div class="box-w40">
        The quick brown fox jumps over the lazy dog. This demonstrates how text wraps at different container widths.
      </div>

      <p class="label">Width: 30 characters</p>
      <div class="box-w30">
        The quick brown fox jumps over the lazy dog. This demonstrates how text wraps at different container widths.
      </div>

      <p class="label">Width: 20 characters</p>
      <div class="box-w20">
        The quick brown fox jumps over the lazy dog. This demonstrates how text wraps at different container widths.
      </div>
    </div>

    <p class="footer">Press Ctrl+C to exit</p>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 1;
  gap: 1;
  overflow: scroll;
}

h1 {
  color: cyan;
  margin: 0;
  padding: 0 0 1 0;
}

h2 {
  color: yellow;
  margin: 0;
  font-size: 1;
}

p {
  margin: 0;
  padding: 0;
}

.intro {
  color: gray;
  margin-bottom: 1;
}

.section {
  padding: 1;
  border: 1px solid blue;
  margin-bottom: 1;
}

.box-normal {
  width: 50%;
  background: #1a1a1a;
  color: green;
  border: 1px solid green;
  padding: 1;
}

.box-normal p {
  margin: 0;
}

.box-nowrap {
  width: 35;
  background: #1a1a1a;
  color: cyan;
  border: 1px solid cyan;
  padding: 1;
  overflow: scroll;
}

.box-pre {
  width: 40;
  background: #000;
  color: white;
  border: 1px solid gray;
  padding: 1;
  margin: 0;
  overflow: scroll;
}

.box-prewrap {
  width: 40;
  background: #1a1a1a;
  color: magenta;
  border: 1px solid magenta;
  padding: 1;
}

.box-code {
  display: block;
  width: 40;
  background: #222;
  color: brightgreen;
  border: 1px solid brightgreen;
  padding: 1;
  overflow: scroll;
}

.label {
  color: brightblue;
  margin: 1 0 0 0;
  font-weight: bold;
}

.box-w40 {
  width: 40;
  background: #1a1a1a;
  color: cyan;
  border: 1px solid cyan;
  padding: 1;
}

.box-w30 {
  width: 30;
  background: #1a1a1a;
  color: magenta;
  border: 1px solid magenta;
  padding: 1;
}

.box-w20 {
  width: 20;
  background: #1a1a1a;
  color: yellow;
  border: 1px solid yellow;
  padding: 1;
}

.note {
  color: gray;
  font-size: 0.8;
  margin-top: 0.5;
}

.footer {
  color: gray;
  margin-top: 2;
}
</style>
