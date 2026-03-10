/**
 * Runtime helpers and utilities for vterm apps
 * Re-export commonly used Vue APIs for convenience
 */
export {
    ref,
    reactive,
    computed,
    watch,
    watchEffect,
    onMounted,
    onUnmounted,
    onBeforeMount,
    onBeforeUnmount,
    defineComponent,
    h,
    inject,
    provide,
    getCurrentInstance,
    shallowRef,
    shallowReactive,
    toRef,
    toRefs,
    unref,
    isRef,
    useSlots,
    useAttrs,
} from "vue"

/**
 * Router utilities
 */
export {
    createRouter,
    useRouter,
    useRoute,
    RouterView,
    RouterLink,
    installRouter,
    type Route,
    type Router,
    type RouteMatch,
} from "../core/router"

/**
 * Composables for terminal integration
 */
export { useKeys, useScreen, useFocus, useRender } from "../core/platform/composables/exports"

/**
 * Storage utilities
 */
export { useStore, createStore, type Store, type StoreOptions } from "../core/platform/store/store"

/**
 * Config primitive and page metadata
 */
export { defineVtermConfig, definePageMeta, type VTermConfig, type PageMeta } from "../types/types"
