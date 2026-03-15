/**
 * Production runtime for bundled vterm apps.
 *
 * This entry point is intentionally free of all build-time dependencies:
 *   ✗ @vue/compiler-sfc  (SFCs already AOT-compiled)
 *   ✗ sucrase            (TypeScript already stripped)
 *   ✗ unimport           (auto-imports already injected)
 *   ✗ glob               (file scanning not needed at runtime)
 *
 * Import from "@arcforge/vterm/runtime/prod" in generated bootstraps.
 * Do NOT import from "@arcforge/vterm/runtime" in bundled apps — that
 * entry pulls in sfc-loader which drags in the full compiler chain.
 */

export {
    ref, reactive, computed, watch, watchEffect,
    onMounted, onUnmounted, onBeforeMount, onBeforeUnmount,
    defineComponent, h, inject, provide, getCurrentInstance,
    shallowRef, shallowReactive, toRef, toRefs, unref, isRef,
    useSlots, useAttrs,
} from "vue"

export {
    createRouter, useRouter, useRoute, RouterView, RouterLink,
    installRouter,
    type Route, type Router, type RouteMatch,
} from "../core/router"

// In production, file-based routes are pre-resolved by the bootstrap — these
// are no-ops kept for API compatibility with compiled SFC auto-imports.
export function loadFileBasedRoutes(): any[] { return [] }
export function useFileBasedRoutes(): any[] { return [] }

export { useKeys, useScreen, useFocus, useRender, useTerminal, useProcess } from "../core/platform/composables/exports"

export { useStore, createStore, type Store, type StoreOptions } from "../core/platform/store/store"

export {
    defineVtermConfig, definePageMeta,
    type VTermConfig, type PageMeta, type VTermApp, type VTermOptions, type SnapshotOptions,
} from "../types/types"

export { resolveIcon, NERD_FONT_ICONS, setNerdfontsSetting, resolveNerdfontVersion, type NerdFontName } from "./elements/nerd-fonts"

// Production vterm() — no compiler, no sfc-loader
export { vtermProd as vterm } from "../core/vterm-prod"

// Scope ID helpers for compiled SFC render functions
export { pushScopeId as __pushScopeId, popScopeId as __popScopeId } from "../core/compiler/scope-id"

// v-model and other directives for compiled SFC templates
export { vModelText as __vModelText } from "../core/compiler/directives"
