import type { ElementBehavior } from './types'

const registry = new Map<string, ElementBehavior>()

export function registerElement(type: string, behavior: ElementBehavior): void {
    registry.set(type, behavior)
}

export function getElement(type: string): ElementBehavior | undefined {
    return registry.get(type)
}
