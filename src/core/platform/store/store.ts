import { reactive, readonly, inject, type InjectionKey, type UnwrapNestedRefs } from "vue"
import {
  type StorageAdapter,
  JSONStorageAdapter,
  SQLiteStorageAdapter,
  getStorePath,
  getByPath,
  setByPath,
  deleteByPath,
} from "./store-adapters"

/**
 * Store options
 */
export interface StoreOptions {
  /** Storage adapter type (default: 'json') */
  adapter?: 'json' | 'sqlite'

  /** Custom data directory (overrides platform defaults) */
  dataDir?: string
}

/**
 * Store interface with full type safety
 */
export interface Store<T extends Record<string, any> = Record<string, any>> {
  /** Get a value by path */
  get<K extends string>(path: K): any

  /** Set a value by path (auto-persists) */
  set<K extends string>(path: K, value: any): Promise<void>

  /** Delete a value by path (auto-persists) */
  delete(path: string): Promise<void>

  /** Clear all data (auto-persists) */
  clear(): Promise<void>

  /** Update a value using an updater function (auto-persists) */
  update<K extends string>(path: K, updater: (old: any) => any): Promise<void>

  /** Check if a path exists */
  has(path: string): boolean

  /** Get all top-level keys */
  keys(): string[]

  /** Get all top-level values */
  values(): any[]

  /** Get all top-level entries as [key, value] pairs */
  entries(): [string, any][]

  /** Alias for keys() */
  list(): string[]

  /** Reactive data object (readonly) */
  readonly data: Readonly<UnwrapNestedRefs<T>>

  /** Manually save data (useful for batch operations) */
  save(): Promise<void>

  /** Manually reload data from storage */
  load(): Promise<void>

  /** Close the store and cleanup resources */
  close(): Promise<void>
}

/**
 * Injection key for store registry
 */
export const StoreSymbol: InjectionKey<Map<string, Store>> = Symbol('vterm-store')

/**
 * Injection key for default store options
 */
export const StoreOptionsSymbol: InjectionKey<StoreOptions> = Symbol('vterm-store-options')

/**
 * Create a new store instance
 *
 * @param namespace - Unique namespace for this store
 * @param options - Store configuration options
 *
 * @example
 * ```ts
 * const store = createStore('my-app')
 * await store.set('theme', 'dark')
 * const theme = store.get('theme')
 * ```
 *
 * @example With TypeScript types
 * ```ts
 * interface AppStore {
 *   theme: 'light' | 'dark'
 *   count: number
 * }
 *
 * const store = createStore<AppStore>('my-app')
 * ```
 */
export function createStore<T extends Record<string, any> = Record<string, any>>(
  namespace: string,
  options: StoreOptions = {}
): Store<T> {
  const { adapter: adapterType = 'json', dataDir } = options

  // Get storage path
  const storagePath = dataDir
    ? `${dataDir}/${namespace}/${adapterType === 'json' ? 'store.json' : 'store.db'}`
    : getStorePath(namespace, adapterType)

  // Create adapter
  const adapter: StorageAdapter = adapterType === 'json'
    ? new JSONStorageAdapter(storagePath)
    : new SQLiteStorageAdapter(storagePath)

  // Reactive data store
  const data = reactive<Record<string, any>>({}) as UnwrapNestedRefs<T>

  // Load initial data
  let loadPromise: Promise<void> | null = null
  let isLoading = false

  async function load(): Promise<void> {
    if (isLoading && loadPromise) {
      return loadPromise
    }

    isLoading = true
    loadPromise = (async () => {
      try {
        const loaded = await adapter.load()
        // Clear existing data
        Object.keys(data).forEach(key => delete (data as any)[key])
        // Merge loaded data
        Object.assign(data, loaded)
      } catch (error) {
        console.error(`[vterm:store:${namespace}] Failed to load data:`, error)
      } finally {
        isLoading = false
      }
    })()

    return loadPromise
  }

  // Auto-load on creation (non-blocking)
  load().catch(err => {
    console.error(`[vterm:store:${namespace}] Initial load failed:`, err)
  })

  /**
   * Save data to storage (auto-persist)
   */
  async function save(): Promise<void> {
    try {
      await adapter.save(data as Record<string, any>)
    } catch (error) {
      console.error(`[vterm:store:${namespace}] Failed to save data:`, error)
      throw error
    }
  }

  /**
   * Get a value by path
   */
  function get<K extends string>(path: K): any {
    return getByPath(data, path)
  }

  /**
   * Set a value by path (auto-persists)
   */
  async function set<K extends string>(path: K, value: any): Promise<void> {
    setByPath(data, path, value)
    await save()
  }

  /**
   * Delete a value by path (auto-persists)
   */
  async function _delete(path: string): Promise<void> {
    deleteByPath(data, path)
    await save()
  }

  /**
   * Clear all data (auto-persists)
   */
  async function clear(): Promise<void> {
    Object.keys(data).forEach(key => delete (data as any)[key])
    await save()
  }

  /**
   * Update a value using an updater function (auto-persists)
   */
  async function update<K extends string>(
    path: K,
    updater: (old: any) => any
  ): Promise<void> {
    const oldValue = get(path)
    const newValue = updater(oldValue)
    await set(path, newValue)
  }

  /**
   * Check if a path exists
   */
  function has(path: string): boolean {
    return getByPath(data, path) !== undefined
  }

  /**
   * Get all top-level keys
   */
  function keys(): string[] {
    return Object.keys(data)
  }

  /**
   * Get all top-level values
   */
  function values(): any[] {
    return Object.values(data)
  }

  /**
   * Get all top-level entries as [key, value] pairs
   */
  function entries(): [string, any][] {
    return Object.entries(data)
  }

  /**
   * Alias for keys()
   */
  function list(): string[] {
    return keys()
  }

  /**
   * Close the store and cleanup resources
   */
  async function close(): Promise<void> {
    await adapter.close()
  }

  return {
    get,
    set,
    delete: _delete,
    clear,
    update,
    has,
    keys,
    values,
    entries,
    list,
    data: readonly(data) as Readonly<UnwrapNestedRefs<T>>,
    save,
    load,
    close,
  }
}

/**
 * Use a store within a vterm app context
 *
 * This composable provides access to stores using Vue's injection system.
 * Each namespace gets its own store instance, which is automatically created
 * on first access and reused for subsequent calls with the same namespace.
 *
 * @param namespace - Unique namespace for the store
 * @param options - Store configuration options
 *
 * @throws Error if called outside a vterm app context
 *
 * @example Basic usage
 * ```vue
 * <script setup lang="ts">
 * import { useStore } from 'vterm'
 *
 * const store = useStore('my-app')
 *
 * // Simple get/set
 * await store.set('theme', 'dark')
 * const theme = store.get('theme')
 *
 * // Nested paths
 * await store.set('user.name', 'Alice')
 * await store.set('user.prefs.notifications', true)
 *
 * // Reactive access
 * const userName = computed(() => store.data.user?.name)
 * </script>
 * ```
 *
 * @example Type-safe usage
 * ```vue
 * <script setup lang="ts">
 * interface AppStore {
 *   theme: 'light' | 'dark'
 *   count: number
 * }
 *
 * const store = useStore<AppStore>('my-app')
 * // Now get() and data have correct types
 * </script>
 * ```
 *
 * @example Using SQLite adapter
 * ```vue
 * <script setup lang="ts">
 * const store = useStore('my-app', { adapter: 'sqlite' })
 * // Same API, backed by SQLite for better performance with large datasets
 * </script>
 * ```
 */
export function useStore<T extends Record<string, any> = Record<string, any>>(
  namespace: string,
  options?: StoreOptions
): Store<T> {
  const registry = inject(StoreSymbol)

  if (!registry) {
    throw new Error('useStore must be called within a vterm app context')
  }

  // Get default store options from config if available
  const defaultOptions = inject(StoreOptionsSymbol, {})

  // Merge default options with provided options (provided options take precedence)
  const mergedOptions: StoreOptions = {
    ...defaultOptions,
    ...options,
  }

  // Return existing store or create new one
  if (!registry.has(namespace)) {
    registry.set(namespace, createStore<T>(namespace, mergedOptions))
  }

  return registry.get(namespace) as Store<T>
}
