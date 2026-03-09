# Layout Engine

**Platform-agnostic layout computation for VTerm**

## Overview

The layout engine is a critical architectural layer that separates layout computation from platform-specific rendering. It provides a clean, testable, and extensible foundation for VTerm's rendering pipeline.

```
Vue VNode → Layout Engine → Layout Tree → Platform Renderer (Blessed/etc.)
                   ↑
              Zero blessed deps
              Fully testable
```

## Architecture

### Key Principles

1. **Platform Agnostic**: No blessed or terminal dependencies
2. **Testable**: 100% testable without terminal access
3. **Modular**: Clear separation between box model, flexbox, and tree building
4. **Performant**: < 5ms for 100-node layouts

### Modules

- **`types.ts`** - Core type definitions (LayoutNode, LayoutProperties, etc.)
- **`box-model.ts`** - CSS box model calculations (padding, margin, border)
- **`flexbox.ts`** - Flexbox layout algorithm
- **`tree.ts`** - Layout tree building and computation
- **`index.ts`** - Public API exports

## API

### Creating a Layout Engine

```typescript
import { createLayoutEngine } from '@arcforge/vterm/core/layout'

const engine = createLayoutEngine(800, 600) // containerWidth, containerHeight
```

### Building a Layout Tree

```typescript
import { h } from 'vue'

// Create VNode
const vnode = h('box', { class: 'container' }, [
  h('text', { class: 'title' }, 'Hello World'),
  h('button', { class: 'btn' }, 'Click Me')
])

// Define styles
const styles = new Map()
styles.set('.container', {
  width: 800,
  height: 600,
  display: 'flex',
  flexDirection: 'column',
  padding: 10
})
styles.set('.title', { width: 780, height: 30 })
styles.set('.btn', { width: 780, height: 40 })

// Build layout tree
const layoutTree = engine.buildLayoutTree(vnode, styles)
```

### Computing Layout

```typescript
// Compute layout positions and dimensions
engine.computeLayout(layoutTree)

// Access computed layout
console.log(layoutTree.layout)
// {
//   x: 0,
//   y: 0,
//   width: 800,
//   height: 600,
//   padding: { top: 10, right: 10, bottom: 10, left: 10 },
//   margin: { top: 0, right: 0, bottom: 0, left: 0 },
//   border: { width: 0, type: 'line' }
// }
```

## Layout Properties

### Box Model

```typescript
{
  width: 100,           // Fixed width
  height: '50%',        // Percentage of container
  padding: 10,          // All sides
  paddingTop: 5,        // Individual sides
  margin: { top: 5, right: 10, bottom: 5, left: 10 },
  border: { width: 1, fg: 'white', type: 'line' }
}
```

### Flexbox

```typescript
{
  display: 'flex',
  flexDirection: 'row',           // 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justifyContent: 'space-between', // 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  alignItems: 'center',           // 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  gap: 10
}
```

### Positioning

```typescript
{
  position: 'absolute',
  top: 20,
  left: 30
}

{
  position: 'relative',
  top: 5,
  left: 10
}
```

### Constraints

```typescript
{
  minWidth: 100,
  maxWidth: 500,
  minHeight: 50,
  maxHeight: 300
}
```

### Visual Styles

```typescript
{
  visualStyles: {
    fg: 'white',
    bg: 'blue',
    bold: true,
    underline: true,
    border: { fg: 'cyan' }
  }
}
```

## Layout Node Structure

```typescript
interface LayoutNode {
  // Identity
  id: string              // Unique node ID
  type: ElementType       // 'box', 'text', 'button', etc.

  // Computed layout (set by layout engine)
  layout: {
    x: number             // Absolute position
    y: number
    width: number         // Computed dimensions
    height: number
    padding: Spacing
    margin: Spacing
    border: BorderStyle
  }

  // Visual styles
  style: {
    fg?: string
    bg?: string
    bold?: boolean
    underline?: boolean
    // ...
  }

  // Content & behavior
  content?: string
  props: Record<string, any>
  events: Map<string, EventHandler>

  // Tree structure
  children: LayoutNode[]
  parent: LayoutNode | null
}
```

## Testing

The layout engine has comprehensive test coverage:

- **121 tests** across 4 test files
- **99.6% code coverage**
- **100% function coverage**
- **Zero blessed dependencies** (fully unit testable)

Run tests:

```bash
bun test src/core/layout/
```

## Examples

### Flexbox Row Layout

```typescript
const engine = createLayoutEngine(300, 100)

const vnode = h('box', { class: 'container' }, [
  h('box', { class: 'item' }),
  h('box', { class: 'item' }),
  h('box', { class: 'item' }),
])

const styles = new Map()
styles.set('.container', {
  width: 300,
  height: 100,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 10
})
styles.set('.item', { width: 80, height: 80 })

const tree = engine.buildLayoutTree(vnode, styles)
engine.computeLayout(tree)

// Items are positioned with space-between
console.log(tree.children[0].layout.x) // 0
console.log(tree.children[1].layout.x) // 110
console.log(tree.children[2].layout.x) // 220
```

### Nested Layouts with Padding

```typescript
const engine = createLayoutEngine(200, 200)

const vnode = h('box', { class: 'outer' }, [
  h('box', { class: 'inner' }, [
    h('text', {}, 'Nested')
  ])
])

const styles = new Map()
styles.set('.outer', {
  width: 200,
  height: 200,
  padding: 20,
  border: { width: 1, type: 'line' }
})
styles.set('.inner', {
  width: 100,
  height: 100,
  margin: 10
})

const tree = engine.buildLayoutTree(vnode, styles)
engine.computeLayout(tree)

// Inner box is offset by outer padding + border + its own margin
console.log(tree.children[0].layout.x) // 31 (padding 20 + border 1 + margin 10)
console.log(tree.children[0].layout.y) // 31
```

### Responsive Percentage Widths

```typescript
const engine = createLayoutEngine(400, 300)

const vnode = h('box', { class: 'container' }, [
  h('box', { class: 'sidebar' }),
  h('box', { class: 'main' }),
])

const styles = new Map()
styles.set('.container', {
  width: 400,
  height: 300,
  display: 'flex',
  flexDirection: 'row'
})
styles.set('.sidebar', { width: '25%', height: 300 })
styles.set('.main', { width: '75%', height: 300 })

const tree = engine.buildLayoutTree(vnode, styles)
engine.computeLayout(tree)

console.log(tree.children[0].layout.width) // 100 (25% of 400)
console.log(tree.children[1].layout.width) // 300 (75% of 400)
```

## Performance

The layout engine is designed for performance:

- **< 5ms** for 100-node layouts
- Efficient flexbox algorithm
- Minimal memory allocations
- No unnecessary re-calculations

Benchmark included in test suite:

```bash
bun test src/core/layout/index.test.ts --grep "Performance"
```

## Future Enhancements

Potential improvements for future phases:

1. **Layout Caching** - Cache computed layouts for static nodes
2. **Incremental Updates** - Diff layout trees and patch only changed nodes
3. **Grid Layout** - CSS Grid support
4. **Absolute Positioning** - Full absolute/fixed positioning support
5. **Text Measurement** - Measure text content for proper wrapping

## Contributing

When adding new layout features:

1. **Keep it platform-agnostic** - No blessed dependencies
2. **Write tests first** - Maintain 100% function coverage
3. **Document examples** - Add usage examples to this README
4. **Benchmark performance** - Ensure < 5ms for 100 nodes

## License

Part of VTerm - see main LICENSE file.
