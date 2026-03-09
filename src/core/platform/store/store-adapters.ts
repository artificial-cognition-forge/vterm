import { homedir } from "os"
import { join, dirname } from "path"
import { Database } from "bun:sqlite"
import { mkdir } from "fs/promises"

/**
 * Path helper utilities for nested object access
 */

/**
 * Get a value from a nested object using dot notation path
 * @example getByPath({ user: { name: 'Alice' } }, 'user.name') // 'Alice'
 */
export function getByPath(obj: any, path: string): any {
  const keys = path.split('.')
  return keys.reduce((acc, key) => acc?.[key], obj)
}

/**
 * Set a value in a nested object using dot notation path
 * Creates intermediate objects as needed
 * @example setByPath({}, 'user.name', 'Alice') // { user: { name: 'Alice' } }
 */
export function setByPath(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((acc, key) => {
    if (!(key in acc)) acc[key] = {}
    return acc[key]
  }, obj)
  target[lastKey] = value
}

/**
 * Delete a value from a nested object using dot notation path
 * @returns true if the path existed and was deleted, false otherwise
 */
export function deleteByPath(obj: any, path: string): boolean {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = getByPath(obj, keys.join('.'))
  if (target && lastKey in target) {
    delete target[lastKey]
    return true
  }
  return false
}

/**
 * Flatten a nested object into dot-notation paths
 * @example flattenObject({ user: { name: 'Alice' } }) // { 'user.name': 'Alice' }
 */
export function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(result, flattenObject(value, newKey))
    } else {
      // Store primitive values, arrays, and null
      result[newKey] = value
    }
  }

  return result
}

/**
 * Cross-platform data directory resolution
 */

/**
 * Get the platform-appropriate data directory
 * - Linux: XDG_DATA_HOME or ~/.local/share
 * - macOS: ~/Library/Application Support
 * - Windows: %APPDATA%
 */
export function getDataDir(): string {
  const platform = process.platform
  const home = homedir()

  switch (platform) {
    case 'linux':
      return process.env.XDG_DATA_HOME || join(home, '.local', 'share')
    case 'darwin':
      return join(home, 'Library', 'Application Support')
    case 'win32':
      return process.env.APPDATA || join(home, 'AppData', 'Roaming')
    default:
      return join(home, '.local', 'share')
  }
}

/**
 * Get the full storage path for a namespace and adapter type
 */
export function getStorePath(namespace: string, adapter: 'json' | 'sqlite'): string {
  const dataDir = getDataDir()
  const appDir = join(dataDir, 'vterm', namespace)
  const filename = adapter === 'json' ? 'store.json' : 'store.db'
  return join(appDir, filename)
}

/**
 * Ensure the directory for a file path exists
 */
async function ensureDir(filePath: string): Promise<void> {
  const dir = dirname(filePath)
  await mkdir(dir, { recursive: true })
}

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
  load(): Promise<Record<string, any>>
  save(data: Record<string, any>): Promise<void>
  close(): Promise<void>
}

/**
 * JSON file storage adapter
 * Stores data as a pretty-printed JSON file for easy inspection
 */
export class JSONStorageAdapter implements StorageAdapter {
  constructor(private filePath: string) {}

  async load(): Promise<Record<string, any>> {
    try {
      const file = Bun.file(this.filePath)
      if (await file.exists()) {
        return await file.json()
      }
      return {}
    } catch (error) {
      console.error(`[vterm:store] Failed to load JSON store from ${this.filePath}:`, error)
      return {}
    }
  }

  async save(data: Record<string, any>): Promise<void> {
    try {
      await ensureDir(this.filePath)
      await Bun.write(this.filePath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error(`[vterm:store] Failed to save JSON store to ${this.filePath}:`, error)
      throw error
    }
  }

  async close(): Promise<void> {
    // No cleanup needed for JSON adapter
  }
}

/**
 * SQLite storage adapter
 * Stores data in a SQLite database for better performance with large datasets
 */
export class SQLiteStorageAdapter implements StorageAdapter {
  private db: Database

  constructor(private dbPath: string) {
    // Ensure directory exists before creating database
    const dir = dirname(dbPath)
    mkdir(dir, { recursive: true }).catch(err => {
      console.error(`[vterm:store] Failed to create directory for SQLite database:`, err)
    })

    this.db = new Database(dbPath)
    this.initialize()
  }

  private initialize() {
    // Create the store table if it doesn't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS store (
        path TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `)

    // Create index for faster path lookups
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_path_prefix ON store(path)
    `)
  }

  async load(): Promise<Record<string, any>> {
    try {
      const rows = this.db.query('SELECT path, value, type FROM store').all() as Array<{
        path: string
        value: string
        type: string
      }>

      const data: Record<string, any> = {}

      for (const row of rows) {
        const { path, value, type } = row
        let parsedValue: any

        // Parse the value based on its type
        switch (type) {
          case 'object':
          case 'array':
            parsedValue = JSON.parse(value)
            break
          case 'number':
            parsedValue = Number(value)
            break
          case 'boolean':
            parsedValue = value === 'true'
            break
          case 'null':
            parsedValue = null
            break
          case 'undefined':
            parsedValue = undefined
            break
          default: // string
            parsedValue = value
        }

        setByPath(data, path, parsedValue)
      }

      return data
    } catch (error) {
      console.error(`[vterm:store] Failed to load SQLite store from ${this.dbPath}:`, error)
      return {}
    }
  }

  async save(data: Record<string, any>): Promise<void> {
    try {
      // Flatten nested object into paths
      const paths = flattenObject(data)

      // Begin transaction for atomic updates
      this.db.run('BEGIN TRANSACTION')

      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO store (path, value, type, created_at, updated_at)
          VALUES (
            ?,
            ?,
            ?,
            COALESCE((SELECT created_at FROM store WHERE path = ?), strftime('%s', 'now')),
            strftime('%s', 'now')
          )
        `)

        for (const [path, value] of Object.entries(paths)) {
          let type: string
          let serialized: string

          if (value === null) {
            type = 'null'
            serialized = ''
          } else if (value === undefined) {
            type = 'undefined'
            serialized = ''
          } else if (typeof value === 'object') {
            type = Array.isArray(value) ? 'array' : 'object'
            serialized = JSON.stringify(value)
          } else {
            type = typeof value
            serialized = String(value)
          }

          stmt.run(path, serialized, type, path)
        }

        // Clean up paths that no longer exist in the data
        const existingPaths = (this.db.query('SELECT path FROM store').all() as Array<{ path: string }>)
          .map(row => row.path)

        const currentPaths = Object.keys(paths)
        const deletedPaths = existingPaths.filter(path => !currentPaths.includes(path))

        if (deletedPaths.length > 0) {
          const deleteStmt = this.db.prepare('DELETE FROM store WHERE path = ?')
          for (const path of deletedPaths) {
            deleteStmt.run(path)
          }
        }

        this.db.run('COMMIT')
      } catch (error) {
        this.db.run('ROLLBACK')
        throw error
      }
    } catch (error) {
      console.error(`[vterm:store] Failed to save SQLite store to ${this.dbPath}:`, error)
      throw error
    }
  }

  async close(): Promise<void> {
    try {
      this.db.close()
    } catch (error) {
      console.error(`[vterm:store] Failed to close SQLite database:`, error)
    }
  }
}
