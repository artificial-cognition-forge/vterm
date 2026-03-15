/**
 * CSS scope ID stack — shared between the SFC loader (dev) and the layout
 * renderer. Lives here so the renderer can import it without pulling in the
 * full sfc-loader (and its @vue/compiler-sfc dependency chain).
 *
 * _pushScopeId / _popScopeId are called by Vue's compiled render functions.
 * The layout renderer reads the current ID via getCurrentScopeId() to stamp
 * each LayoutNode with the right scoped-styles ID.
 */

const _scopeStack: string[] = []

export function getCurrentScopeId(): string | null {
    return _scopeStack.length > 0 ? _scopeStack[_scopeStack.length - 1]! : null
}

export function pushScopeId(id: string): void {
    _scopeStack.push(id)
}

export function popScopeId(): void {
    _scopeStack.pop()
}
