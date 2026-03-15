/**
 * JSON schema validation for the <editor> element.
 *
 * Given a JSON string and an optional JSON Schema object, returns an array of
 * Diagnostic items (line-level, 1-based) that the editor renders as underlines.
 *
 * Uses:
 *   - jsonc-parser  to parse JSON and resolve each AJV instancePath to a source line
 *   - ajv           for JSON Schema Draft-7 validation
 */

import Ajv from 'ajv'
import { parseTree, findNodeAtLocation, type Node as JsoncNode } from 'jsonc-parser'

export interface EditorDiagnostic {
    /** 1-based line number */
    line: number
    severity: 'error' | 'warning'
    message: string
}

// Single Ajv instance — reused across calls (schema compilation is cached by ref)
const ajv = new Ajv({ allErrors: true, strict: false })

/**
 * Validate `jsonText` against `schema`.
 * Returns an empty array when the text is empty or the schema is absent.
 * Returns a single parse-error diagnostic when the JSON is malformed.
 */
export function validateJson(jsonText: string, schema: object): EditorDiagnostic[] {
    if (!jsonText.trim()) return []

    // Parse with jsonc-parser (gives us a position-aware CST)
    const parseErrors: { error: number; offset: number; length: number }[] = []
    const tree = parseTree(jsonText, parseErrors)

    // Surface parse errors first — no point running AJV on broken JSON
    if (parseErrors.length > 0 || !tree) {
        return parseErrors.map(e => ({
            line: offsetToLine(jsonText, e.offset),
            severity: 'error',
            message: 'JSON syntax error',
        }))
    }

    // Compile (or retrieve cached) validator
    let validate = ajv.getSchema('_vterm_schema_')
    if (!validate) {
        validate = ajv.compile(schema)
        // Store under a stable key so next call reuses the compiled validator
        // (recompile only if the schema object reference changed — see below)
    }

    // If schema object has changed (new reference), recompile
    const existing = (ajv as any)._cache?.get?.('_vterm_schema_')
    if (!existing || (validate as any).schema !== schema) {
        try {
            ajv.removeSchema('_vterm_schema_')
        } catch (_) { /* ignore */ }
        validate = ajv.compile(schema)
        // Store the schema reference on the validator so we can detect changes
        ;(validate as any).schema = schema
    }

    // Parse JSON value for AJV (standard JSON — jsonc-parser strips comments)
    let parsed: unknown
    try {
        parsed = JSON.parse(jsonText)
    } catch {
        return [{ line: 1, severity: 'error', message: 'JSON parse error' }]
    }

    const valid = validate(parsed)
    if (valid || !validate.errors) return []

    return validate.errors.map(err => {
        const instancePath = err.instancePath ?? ''
        const line = resolvePathToLine(jsonText, tree, instancePath)
        const missingProp = err.params && 'missingProperty' in err.params
            ? ` '${(err.params as any).missingProperty}'`
            : ''
        return {
            line,
            severity: 'error' as const,
            message: `${err.message ?? 'validation error'}${missingProp}`,
        }
    })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a flat character offset to a 1-based line number. */
function offsetToLine(text: string, offset: number): number {
    const before = text.slice(0, Math.max(0, offset))
    return before.split('\n').length
}

/**
 * Walk an AJV instancePath like "/address/city" through the JSONC parse tree
 * to find the source line of the offending node.
 * Falls back to line 1 if the path can't be resolved.
 */
function resolvePathToLine(text: string, tree: JsoncNode, instancePath: string): number {
    if (!instancePath) return 1

    const segments = instancePath
        .split('/')
        .filter(s => s !== '')
        .map(s => (isNaN(Number(s)) ? s : Number(s)))

    const node = findNodeAtLocation(tree, segments)
    if (!node) return 1

    return offsetToLine(text, node.offset)
}
