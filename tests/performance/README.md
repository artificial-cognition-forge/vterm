# VTerm Performance Testing Suite

A comprehensive performance test suite that measures the vterm rendering pipeline across all stages, from CSS parsing through frame differencing.

## Quick Start

**Run regression tests (CI mode):**
```bash
bun test tests/performance/limits.test.ts
```

**Run statistical benchmarks (profiling):**
```bash
bun test tests/performance/benchmarks.test.ts
```

## How It Works

The suite has two complementary test files:

### `limits.test.ts` — Hard Regression Limits (CI)

Uses `performance.now()` to measure real time and asserts against hard limits. These tests:
- Run in CI and fail if a regression exceeds the limit
- Start with generous limits (~3-5x current baseline)
- Include console output showing actual measurements
- Document what limit to tighten to after each optimization

**When a test fails:**
1. Run `bun test tests/performance/benchmarks.test.ts` to see detailed ops/sec
2. Identify which stage regressed
3. Profile/optimize that component
4. Update the limit in `LIMITS_MS` and commit

### `benchmarks.test.ts` — Statistical Discovery

Runs multiple iterations to compute percentiles and ops/sec. These tests:
- Never fail (pure discovery/profiling)
- Show p50, p95, max, and ops/sec per operation
- Help identify which stages are slowest
- Run manually when investigating performance

## Current Baseline

All measurements in milliseconds (lower is better). Run `bun test tests/performance/benchmarks.test.ts` to see current ops/sec.

**CSS Parsing:**
| Operation | Mean | p95 | Ops/sec |
|---|---|---|---|
| Small CSS (5 props) | 0.036ms | 0.080ms | 28k |
| Medium CSS (20 props, nested) | 0.078ms | 0.156ms | 12.8k |
| Large CSS (50+ props) | 0.108ms | 0.159ms | 9.3k |

**Layout Engine:**
| Operation | Mean | p95 | Ops/sec |
|---|---|---|---|
| Tree build - small (20 nodes) | 0.041ms | 0.072ms | 24k |
| Tree build - large (200 nodes) | 0.257ms | 0.345ms | 3.9k |
| Compute - small (20 nodes) | 0.037ms | 0.065ms | 27k |
| Compute - medium (60 nodes) | 0.176ms | 0.138ms | 5.7k |
| Compute - large (200 nodes) | 0.361ms | 0.474ms | 2.8k |
| Compute - deep (10 levels) | 0.006ms | 0.008ms | 178k |

**Buffer Renderer:**
| Operation | Mean | p95 | Ops/sec |
|---|---|---|---|
| Render small (80×24) | 0.239ms | 0.353ms | 4.2k |
| Render large (220×50) | 1.174ms | 2.565ms | 852 |

**Frame Differ:**
| Operation | Mean | p95 | Ops/sec |
|---|---|---|---|
| First render (full repaint) | 0.089ms | 0.122ms | 11.2k |
| Identical frames (no change) | 0.056ms | 0.111ms | 17.7k |
| Delta (5% changed) | 0.077ms | 0.108ms | 13k |

**Full Pipeline:**
| Operation | Mean | p95 | Ops/sec |
|---|---|---|---|
| Small app (CSS + layout + render) | 0.153ms | 0.331ms | 6.5k |
| Large app (200 nodes, 220×50) | 1.498ms | 4.593ms | 667 |

## Optimization Workflow

### 1. Profile to Find the Bottleneck

```bash
bun test tests/performance/benchmarks.test.ts
```

Look for low ops/sec or high mean/p95 times.

### 2. Optimize the Component

Based on the code analysis, known hotspots are:

- **HIGH**: `src/runtime/terminal/buffer.ts:97` — `clear()` allocates W×H cells per frame (11,000+ for 220×50)
- **HIGH**: `src/runtime/renderer/rendering-pass.ts:233` — `computeClipBoxFromAncestors()` O(N×D) walk per node per pass
- **MEDIUM**: `src/runtime/terminal/ansi.ts:33` — `hexToRgb()` regex per hex color, no caching
- **MEDIUM**: `src/runtime/renderer/rendering-pass.ts:558` — `getEffectiveStyle()` spreads per interactive node
- **MEDIUM**: `src/core/layout/stacking-context.ts:170` — `computeRenderOrder()` intermediate arrays per context

### 3. Verify Improvement

```bash
bun test tests/performance/benchmarks.test.ts  # should show improvement in ops/sec
bun test tests/performance/limits.test.ts      # should still pass
```

### 4. Tighten the Limit

Update `LIMITS_MS` in `limits.test.ts` to ~1.5x the new measured value:

```typescript
const LIMITS = {
  bufferRenderLarge: 5,  // was 40, improved from 1.2ms to 0.7ms
}
```

Commit with updated limit + test results.

## Test Scenarios

### CSS Parsing
- Small: 5 basic properties
- Medium: 20 properties with nesting
- Large: 50+ properties with complex selectors

### Layout Engine
- Small: 20-node flat tree
- Medium: ~60 nodes, typical UI depth
- Large: 200 nodes, realistic app
- Deep: 10-level nesting, each with 1 child

### Buffer Renderer
- Small: 80×24 terminal, minimal content
- Large: 220×50 terminal, dense content

### Frame Differ
- First: `diff(null, buffer)` — full repaint
- Identical: `diff(buffer, buffer)` — best case
- Delta: 5% cells changed — typical interactive update

### Full Pipeline
- Small app: CSS + tree build + layout + render for 20 nodes
- Large app: Full cycle for 200 nodes, 220×50 terminal

## Files

- `helpers.ts` — Shared utilities: `timed()`, scenario builders, CSS/VNode scenarios
- `limits.test.ts` — Hard limits for CI (assertion-based)
- `benchmarks.test.ts` — Statistical discovery (for profiling)

## Implementation Notes

### `timed()` Helper

Automatically warmups 5 times, then measures N iterations:
```typescript
const result = timed(() => {
  engine.computeLayout(tree)
}, 50)

console.log(`p50: ${result.p50}ms, p95: ${result.p95}ms`)
```

Returns: `{ p50, p95, max, min, mean }`

### Scenario Builders

Pre-compute CSS/VNode/layout scenarios to isolate the component being measured:

```typescript
const scenario = await buildScenario(CSS_SCENARIOS.large, buildTreeLarge(), 220, 50)
// scenario.engine, scenario.tree, scenario.buffer, scenario.renderer ready
```

## Tips

- **Isolate measurements**: Use `buildScenario()` to pre-compute CSS so you're only timing layout/render
- **Consistent environment**: Run on the same machine without other workloads
- **Multiple runs**: The `timed()` function runs warmups + iterations automatically
- **Percentiles matter**: p95 can show variability even if p50 looks good
- **Add comments**: Document what limit should be after optimization: `// tighten to 5 after clear() fix`

## Future Improvements

1. **Scenario diversity**: Add more realistic UI patterns (forms, tables, code editor)
2. **Memory profiling**: Track allocations and GC pressure alongside timing
3. **Regression CI**: Fail PR checks if benchmarks regress by >10%
4. **Profile comparison**: Save baseline, compare new runs
5. **Component isolation**: Add micro-benchmarks for hexToRgb(), cellsEqual(), etc.
