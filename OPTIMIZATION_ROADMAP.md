# VTerm Performance Optimization Roadmap

## Status: 9 Optimizations Complete ✅ → Next 4-5 Major Wins Identified

### Latest Discovery: Flexbox Scaling Bottleneck

From extreme scale testing (16×16 flex grid = 256 items), we identified:

**Flexbox is 4× slower per-item than block layout:**
- Block layout (500 nodes): 1.3μs/node
- Flexbox grid (256 items): 5.5μs/node
- **Root cause**: layoutSingleLine() does 6+ array allocations per line with map/reduce operations

---

## Next Round of Optimizations (Tier 1: High Impact)

### OPT-10: Flexbox Algorithm Optimization [PRIORITY 1 - Est. 2-3× speedup]

**Location:** `src/core/layout/flexbox.ts:161-287` (layoutSingleLine)

**Problem:** The function allocates multiple temporary arrays per invocation:
```typescript
// Line 174: Creates array of margin objects
const childMargins = children.map(c => c.layout?.margin ?? {...})

// Line 175-178: Creates another array
const mainMargins = childMargins.map(m => ({start: ..., end: ...}))

// Line 182-193: Creates baseSizes array
const baseSizes: number[] = []

// Line 217-219: Creates weightedShrinks array
const weightedShrinks = children.map((c, i) => (...))

// Line 240: Creates finalSizes array
const finalSizes = adjustedSizes.map(s => Math.round(s))
```

**For a 16×16 grid:**
- 16 row containers × multiple allocations per row = 80+ temporary arrays
- Each array is small, but GC pressure adds up

**Solution:**
1. Inline margin calculations instead of map() → avoid array allocation
2. Pre-allocate baseSizes, adjustedSizes, finalSizes once per function call
3. Inline the margin calculation loop
4. Avoid weightedShrinks map() - use inline loop

**Expected Gain:** 2-3× speedup for flex-heavy layouts (1.407ms → 0.47ms for flex grid)

**Impact on current baselines:**
- Medium app: no change (uses block layout)
- Large app: no change (mostly block with one flex header)
- **Flex-heavy apps would jump from 1.7ms → 0.5ms (3× faster)**

---

### OPT-11: Tree Building Optimization [PRIORITY 2 - Est. 1.5-2× speedup]

**Location:** `src/core/layout/tree.ts:130-160` (vnodeToLayoutNode)

**Problem:** Tree building dominates for large node counts (42-54% of total time)
- 500-node flat list: 0.509ms tree build
- The function recursively processes every node
- Calls resolveStyles() for each node (even though our index helped, there's still overhead)

**Measurements:**
- Tree build for 200 nodes with CSS: 0.294ms = 1.47μs/node
- Tree build for 500 nodes flat: 0.509ms = 1.02μs/node
- **The CSS complexity case is 45% slower** (1.47 vs 1.02)

**Root causes identified:**
1. Each node calls resolveStyles() which still does several operations:
   - Gets class names from props
   - Looks up simple selector (.className)
   - Looks up compound selectors via index
   - Merges all styles with spread operator

2. extractVisualStyles() is called for every node

3. The recursive traversal itself has overhead

**Solution:**
1. Cache style resolution results - memoize by (class string) → don't recompute same classes
2. Batch-process similar nodes (same classes) to share style computation
3. Inline extractVisualStyles() logic to reduce function call overhead
4. Reuse style objects instead of spreading

**Expected Gain:** 1.5-2× speedup for large trees (0.509ms → 0.25ms for 500-node list)

---

### OPT-12: Layout Compute Optimization [PRIORITY 3 - Est. 1.5× speedup]

**Location:** `src/core/layout/tree.ts:668-820` (computeNodeLayout)

**Problem:** Layout compute dominates for most cases (50-61% of total time)
- 500-node flat list: 0.646ms = 1.29μs/node
- 16×16 flex grid: 1.407ms total layout (includes 256 flex items + containers)

**Current bottlenecks:**
1. Text wrapping calculation: wrapText() called for every node with content
2. applyConstraints() called for every node
3. Recursive calls for all children (unavoidable, but could optimize call overhead)
4. Flex children filtering in OPT-9 helps, but still has overhead

**Solution:**
1. Cache text wrapping results - memoize by (content, width) pair
   - Most text content is static between renders
   - Wrapping result only changes if width changes

2. Optimize constraint application (min/max clamping)
   - Current: separate min/max lookups for x4 (width, height, minWidth, maxWidth, etc.)
   - Could: combine into single constraint object

3. Pre-compute which children need layout (skip display:none upfront)

**Expected Gain:** 1.3-1.5× speedup overall (not just layout - cascades to tree build)

---

### OPT-13: CSS Selector Matching Micro-optimization [PRIORITY 4 - Est. 1.2× speedup]

**Location:** `src/core/layout/tree.ts:238-250` (resolveStyles compound matching)

**Problem:** Even with our compound selector index (OPT-8), there's still per-node overhead
- For each class, we do:
  1. `styles.get(`.${className}`)` - O(1) but has lookup cost
  2. Look up in compound index - O(1) but iterates matching rules
  3. For each compound rule, check ancestor classes - O(precedingParts)

**For 200 nodes with heavy CSS:**
- Average 2-3 classes per node = 400-600 style lookups
- Compound selector matching on top of that

**Solution:**
1. Cache className lookup results in a local Map during tree build
2. Skip redundant ancestor checks for repeated patterns
3. Short-circuit compound matching if no matching entries in index

**Expected Gain:** 1.15-1.2× speedup for CSS-heavy trees (0.294ms → 0.25ms)

---

## Second-Wave Optimizations (Tier 2: Medium Impact)

### OPT-14: Buffer Cloning Performance

**Location:** `src/runtime/terminal/buffer.ts:249-263`

**Current metric:** clone() takes 0.18ms for 80×24, 0.56ms for 220×50
- This is used by frame differ to compare buffers
- Cloning every cell (spread operator) is expensive

**Solution:**
- Use TypedArray instead of object array for cells
- Or use structured clone with binary format
- Or implement copy-on-write semantics

**Expected Gain:** 2-3× speedup (but not on critical path since cloning is infrequent)

---

### OPT-15: Rendering Pass Style Computation

**Location:** `src/runtime/renderer/rendering-pass.ts:574-617`

**Current:** We cache effective style with state key, but style resolution still happens
- getEffectiveStyle() does multiple spread operations
- visualStyleToCellStyle() creates object per call

**Solution:** Further optimize style merging

**Expected Gain:** Minor (10-15%)

---

## Expected Outcomes After All Optimizations

### Before (Current):
- Medium app (80×24, 60 nodes): 0.260ms
- Flex grid (16×16, 256 items): 1.746ms
- Large app (220×50, 200 nodes): 0.909ms

### After (Predicted):
- Medium app: 0.200ms (30% faster)
- **Flex grid: 0.500ms (3.5× faster)** ← biggest win
- Large app: 0.650ms (30% faster)

**Combined impact:** 2-3.5× faster for flex-heavy applications

---

## Recommended Implementation Order

1. **OPT-10 (Flexbox)** ← Biggest bottleneck, high impact
2. **OPT-11 (Tree Building)** ← Secondary bottleneck
3. **OPT-12 (Layout Compute)** ← Cascading improvements
4. **OPT-13 (CSS Matching)** ← Quick win, low risk
5. **OPT-14 (Buffer Cloning)** ← If needed for specific workloads

---

## Remaining Investigation Areas

1. **Does flex wrapping cause multiple algorithm passes?**
   - For the grid case, each row is a separate flex layout
   - Measure if we could optimize cross-row calculations

2. **Can we reduce computeNodeLayout() recursion depth?**
   - For 500-node flat list, are we still doing deep traversals?
   - Could we use iteration instead of recursion?

3. **What's the VNode→LayoutNode conversion cost?**
   - Is it the traversal itself or the Vue.h() call overhead?
   - Can we benchmark vnodeToLayoutNode() in isolation?
