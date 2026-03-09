# Mouse Pointer-Events Implementation Summary

## Overview

Implemented z-index-based hit testing with CSS `pointer-events` support to properly block mouse interactions on overlays. This fixes the critical issue where mouse wheel scroll events were passing through absolutely positioned elements to interact with elements behind them.

## Changes Made

### 1. Type System (`src/core/layout/types.ts`)
- Added `pointerEvents?: "auto" | "none"` to `LayoutProperties` interface
- Supports standard CSS pointer-events behavior

### 2. CSS Transformer (`src/core/css/declaration-transformer.ts`)
- Added case for `pointer-events` property parsing
- Validates values: only `"auto"` and `"none"` are accepted
- Invalid values are silently ignored (CSS standard behavior)

### 3. Interaction Manager (`src/runtime/renderer/interaction.ts`)
- **Refactored `hitTest()` algorithm**:
  - **Old**: Walked DOM tree depth-first, returned deepest node
  - **New**: Collects all nodes containing point, sorts by z-index, returns topmost

- **New Methods**:
  - `collectCandidates()`: Recursively finds all nodes at mouse coordinate with pointer-events enabled
  - `compareZIndex()`: Compares z-index values for sorting

- **Respects pointer-events**:
  - Nodes with `pointer-events: none` are skipped
  - Allows click-through to elements below

### 4. Test Coverage

#### Interaction Tests (`src/runtime/renderer/interaction.test.ts`)
19 comprehensive tests covering:
- **Basic hit testing**: Bounds checking, child/parent hitting
- **Z-index ordering**: Higher z-index takes priority
- **pointer-events blocking**: none-valued elements allow click-through
- **Scroll blocking**: Absolutely positioned overlays block scroll on background
- **Nested scenarios**: Complex z-index hierarchies
- **Realistic patterns**:
  - Modal dialogs blocking background interaction
  - Tooltips with pointer-events: none allowing interaction below
  - Full-screen overlays without breaking scrolling

#### CSS Transformer Tests (`src/core/css/transformer.test.ts`)
4 new tests for pointer-events parsing:
- Parses `pointer-events: auto`
- Parses `pointer-events: none`
- Ignores invalid values
- Defaults correctly when not specified

### 5. Example (`examples/mouse-blocking/`)
Visual demo showing:
- Absolutely positioned overlay blocking scroll
- pointer-events: none overlay allowing scroll through
- Realistic use cases with proper interactions

## Test Results

**Before**: 1207 total tests, 1197 passing
**After**: 1230 total tests, 1220 passing

- Added 23 new tests (19 interaction + 4 CSS)
- No regressions (same 10 pre-existing failures remain)
- All new tests passing

## Backward Compatibility

✅ **Fully backward compatible**
- Default behavior: `pointer-events: auto` (all elements receive events)
- Existing code unchanged
- No breaking API changes
- Leverages existing `LayoutNode.zIndex` field (already computed)

## Key Insights

### The Problem
Old hit-test walked DOM tree hierarchy, not rendering order:
```
DOM Tree:          Rendering Order:
└─ Root           Layer 1: root background
   ├─ Scrollable  Layer 2: scrollable content
   └─ Overlay     Layer 3: overlay (on top)
```
Clicking overlay would find scrollable (deeper in DOM) → wrong target

### The Solution
Collect candidates at mouse point, sort by z-index, return topmost:
1. Overlay contains point → z-index 2 → candidate
2. Scrollable contains point → z-index 1 → candidate
3. Root contains point → z-index 0 → candidate
4. Return overlay (highest z-index) ✓

## Architecture Diagram

```
Input Event (mouse wheel at x, y)
    ↓
InteractionManager.handleMouseEvent()
    ↓
hitTest(x, y, root)
    ├─ collectCandidates() → finds all nodes containing point
    │  └─ respects pointer-events: none
    │
    └─ compareZIndex() → sorts by z-index
       ↓
    Return topmost node
       ↓
    Dispatch event to topmost node
```

## Future Improvements

- [ ] Stacking context tree optimization (currently rebuilt each render)
- [ ] Support for `pointer-events: visible` variant
- [ ] Performance profiling for deeply nested layouts
- [ ] Support for pseudo-element pointer-events override
