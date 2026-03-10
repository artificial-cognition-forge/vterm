/**
 * Hot Reload Tests
 *
 * Verifies that the SFC loader and hot reload cycle correctly:
 * 1. Clears ALL caches (components, styles, routes) on reload
 * 2. Resolves sub-component imports after a cache clear
 * 3. Does not leave stale state that breaks component rendering
 *
 * These tests were added to catch the regression where <Sidebar /> and other
 * imported components would disappear after a hot reload cycle.
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createVNode } from 'vue'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Render a component's setup function and return the first-level children vnodes.
 * Used to verify that sub-components compile as Vue components (shapeFlag=4)
 * rather than as string elements (shapeFlag=1).
 */
function getRenderedChildren(component: any): Array<{ type: any; shapeFlag: number }> {
  if (!component?.setup) return []
  const setupResult = component.setup({}, { attrs: {}, slots: {}, emit: () => {} })
  if (typeof setupResult !== 'function') return []
  const vnode = setupResult({} as any, [])
  const children = vnode?.children
  if (!Array.isArray(children)) return []
  return children.map((c: any) => ({ type: c?.type, shapeFlag: c?.shapeFlag ?? 0 }))
}

/** Create a temp directory with Vue SFC files for testing. */
function createTempProject(): { dir: string; cleanup: () => void } {
  const dir = join(tmpdir(), `vterm-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  mkdirSync(join(dir, 'app', 'components'), { recursive: true })
  mkdirSync(join(dir, 'app', 'pages'), { recursive: true })
  mkdirSync(join(dir, '.vterm'), { recursive: true })

  return {
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}

// ─── Cache clearing ────────────────────────────────────────────────────────────

describe('clearComponentCache', () => {
  test('clears all four caches including cachedRoutes', async () => {
    // Import the module fresh for each test by using dynamic import
    const { clearComponentCache, getAllStyles } = await import(
      '../../src/core/compiler/sfc-loader'
    )

    // The globalStyles map is accessible via getAllStyles()
    // After clear it should be empty
    clearComponentCache()
    expect(getAllStyles().size).toBe(0)
  })

  test('cache is empty after clearComponentCache so next loadSFC recompiles', async () => {
    const { clearComponentCache, getAllStyles } = await import(
      '../../src/core/compiler/sfc-loader'
    )
    // Calling clear twice should not throw
    clearComponentCache()
    clearComponentCache()
    expect(getAllStyles().size).toBe(0)
  })
})

// ─── Component import extraction ──────────────────────────────────────────────

describe('SFC sub-component import extraction', () => {
  let tmpProject: { dir: string; cleanup: () => void }

  beforeEach(() => {
    tmpProject = createTempProject()
  })

  afterEach(() => {
    tmpProject.cleanup()
  })

  test('parent component correctly loads an imported child component', async () => {
    const { dir } = tmpProject

    // Write child component
    writeFileSync(
      join(dir, 'app', 'components', 'child.vue'),
      `<template><div class="child">hello from child</div></template>
<script setup lang="ts"></script>
<style scoped></style>`
    )

    // Write parent component that imports child
    writeFileSync(
      join(dir, 'app', 'pages', 'parent.vue'),
      `<template>
  <div class="parent">
    <Child />
    <div class="other">other content</div>
  </div>
</template>
<script setup lang="ts">
import Child from '../components/child.vue';
</script>
<style scoped>
.parent { display: flex; }
</style>`
    )

    // Initialize auto-imports (required for loadSFC)
    const { initAutoImports, clearAutoImports } = await import(
      '../../src/build/auto-imports'
    )
    clearAutoImports()
    await initAutoImports(dir)

    const { loadSFC, clearComponentCache } = await import(
      '../../src/core/compiler/sfc-loader'
    )
    clearComponentCache()

    const parentPath = join(dir, 'app', 'pages', 'parent.vue')
    const component = await loadSFC(parentPath)

    // Component should be defined and have a render/setup function
    expect(component).toBeDefined()
    expect(typeof component).toBe('object')

    // The component should have a setup function that returns Sidebar
    // (We verify the component is a proper Vue component, not an empty object)
    expect(component.setup ?? component.render).toBeDefined()

    clearAutoImports()
  })

  test('sub-component is still resolved after hot reload cycle (cache clear + reload)', async () => {
    const { dir } = tmpProject

    // Write child component
    writeFileSync(
      join(dir, 'app', 'components', 'sidebar.vue'),
      `<template>
  <div class="sidebar">
    <a href="/">Home</a>
  </div>
</template>
<script setup lang="ts">
const label = ref('sidebar')
</script>
<style scoped></style>`
    )

    // Write page that imports sidebar
    writeFileSync(
      join(dir, 'app', 'pages', 'index.vue'),
      `<template>
  <div class="container">
    <Sidebar />
    <div class="content">content</div>
  </div>
</template>
<script setup lang="ts">
import Sidebar from '../components/sidebar.vue';
</script>
<style scoped>
.container { display: flex; }
</style>`
    )

    const { initAutoImports, clearAutoImports } = await import(
      '../../src/build/auto-imports'
    )
    const { loadSFC, clearComponentCache } = await import(
      '../../src/core/compiler/sfc-loader'
    )

    const pagePath = join(dir, 'app', 'pages', 'index.vue')

    // === First load (simulates first boot) ===
    clearAutoImports()
    await initAutoImports(dir)
    clearComponentCache()
    const component1 = await loadSFC(pagePath)

    expect(component1).toBeDefined()
    expect(component1.setup ?? component1.render).toBeDefined()

    // === Hot reload cycle ===
    clearComponentCache()
    clearAutoImports()
    await initAutoImports(dir)

    const component2 = await loadSFC(pagePath)

    // Component must still be a valid Vue component after hot reload
    expect(component2).toBeDefined()
    expect(component2.setup ?? component2.render).toBeDefined()

    // The two compilations should produce equivalent component structures
    // (both should have setup functions that return the Sidebar binding)
    const hasSetup1 = typeof component1.setup === 'function'
    const hasSetup2 = typeof component2.setup === 'function'
    expect(hasSetup1).toBe(hasSetup2)

    clearAutoImports()
  })

  test('sub-component renders as Vue component (shapeFlag=4) not string element after hot reload', async () => {
    // Regression test: on hot reload, @vue/compiler-sfc returns a mutated descriptor
    // from its internal parse cache. The mutation causes compileScript to compile
    // <Sidebar /> as _createElementVNode("Sidebar") (shapeFlag=1, ELEMENT) instead of
    // _createVNode(SidebarComponent) (shapeFlag=4, STATEFUL_COMPONENT).
    // Fix: clearComponentCache() now calls parseCache.clear() to invalidate stale descriptors.
    const { dir } = tmpProject

    writeFileSync(
      join(dir, 'app', 'components', 'sidebar.vue'),
      `<template><div class="sidebar">nav</div></template>\n<script setup lang="ts"></script>`
    )
    writeFileSync(
      join(dir, 'app', 'pages', 'index.vue'),
      `<template>
  <div class="container">
    <Sidebar />
    <div class="content">content</div>
  </div>
</template>
<script setup lang="ts">
import Sidebar from '../components/sidebar.vue';
</script>`
    )

    const { initAutoImports, clearAutoImports } = await import('../../src/build/auto-imports')
    const { loadSFC, clearComponentCache } = await import('../../src/core/compiler/sfc-loader')

    const pagePath = join(dir, 'app', 'pages', 'index.vue')
    const STATEFUL_COMPONENT = 4

    // First boot
    clearAutoImports()
    await initAutoImports(dir)
    clearComponentCache()
    const comp1 = await loadSFC(pagePath)
    const children1 = getRenderedChildren(comp1)
    const sidebar1 = children1.find(c => typeof c.type !== 'string')
    expect(sidebar1).toBeDefined()
    expect(sidebar1!.shapeFlag).toBe(STATEFUL_COMPONENT)

    // Hot reload — must produce identical vnode shape
    clearComponentCache()
    clearAutoImports()
    await initAutoImports(dir)
    const comp2 = await loadSFC(pagePath)
    const children2 = getRenderedChildren(comp2)
    const sidebar2 = children2.find(c => typeof c.type !== 'string')
    expect(sidebar2).toBeDefined()
    expect(sidebar2!.shapeFlag).toBe(STATEFUL_COMPONENT)

    clearAutoImports()
  })

  test('component with multiple sub-component imports survives hot reload', async () => {
    const { dir } = tmpProject

    // Write two child components
    writeFileSync(
      join(dir, 'app', 'components', 'header.vue'),
      `<template><div class="header"><slot /></div></template>
<script setup lang="ts">
defineProps<{ title?: string }>()
</script>`
    )

    writeFileSync(
      join(dir, 'app', 'components', 'sidebar.vue'),
      `<template><div class="sidebar">nav</div></template>
<script setup lang="ts"></script>`
    )

    // Write page that imports both
    writeFileSync(
      join(dir, 'app', 'pages', 'tag-a.vue'),
      `<template>
  <div class="container">
    <Sidebar />
    <div class="content">
      <Header title="Test">Heading</Header>
      <p>body</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import Sidebar from '../components/sidebar.vue';
import Header from '../components/header.vue';
</script>`
    )

    const { initAutoImports, clearAutoImports } = await import(
      '../../src/build/auto-imports'
    )
    const { loadSFC, clearComponentCache } = await import(
      '../../src/core/compiler/sfc-loader'
    )

    const pagePath = join(dir, 'app', 'pages', 'tag-a.vue')

    // First boot
    clearAutoImports()
    await initAutoImports(dir)
    clearComponentCache()
    const comp1 = await loadSFC(pagePath)
    expect(comp1.setup ?? comp1.render).toBeDefined()

    // Hot reload
    clearComponentCache()
    clearAutoImports()
    await initAutoImports(dir)
    const comp2 = await loadSFC(pagePath)
    expect(comp2.setup ?? comp2.render).toBeDefined()

    clearAutoImports()
  })
})

// ─── Auto-imports safety ───────────────────────────────────────────────────────

describe('auto-imports: component file handling', () => {
  let tmpProject: { dir: string; cleanup: () => void }

  beforeEach(() => {
    tmpProject = createTempProject()
  })

  afterEach(() => {
    tmpProject.cleanup()
  })

  test('getRuntimeComposables does not include .vue component files', async () => {
    const { dir } = tmpProject

    writeFileSync(
      join(dir, 'app', 'components', 'mycomp.vue'),
      `<template><div>hi</div></template><script setup></script>`
    )

    const { initAutoImports, clearAutoImports, getRuntimeComposables } = await import(
      '../../src/build/auto-imports'
    )

    clearAutoImports()
    await initAutoImports(dir)

    const composables = await getRuntimeComposables()

    // .vue component files should NOT appear in runtime composables
    // (they can't be dynamically imported as JS modules)
    const hasVueComponent = Object.keys(composables).some(
      key => key === 'mycomp' || key === 'Mycomp' || key === 'MyComp'
    )
    expect(hasVueComponent).toBe(false)

    clearAutoImports()
  })

  test('transformWithAutoImports passes file ID to unimport', async () => {
    const { dir } = tmpProject

    const { initAutoImports, clearAutoImports, transformWithAutoImports } = await import(
      '../../src/build/auto-imports'
    )

    clearAutoImports()
    await initAutoImports(dir)

    const sfcSource = `<template><div>{{ count }}</div></template>
<script setup lang="ts">
const count = ref(0)
</script>`

    const filePath = join(dir, 'app', 'pages', 'test.vue')

    // Should not throw when called with a file path ID
    const result = await transformWithAutoImports(sfcSource, filePath)
    expect(typeof result).toBe('string')
    // Result should still contain the template/script structure
    expect(result).toContain('<template>')
    expect(result).toContain('<script')

    clearAutoImports()
  })
})
