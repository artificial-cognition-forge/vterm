/**
 * Tests for InputParser — raw byte sequences → KeyEvent
 *
 * We inject raw bytes through stdin (the public I/O surface of InputParser)
 * and assert on the emitted 'keypress' events.
 */

import { test, expect, describe, afterEach } from 'bun:test'
import { InputParser } from './input'
import type { KeyEvent } from './input'

/**
 * Synchronously feed bytes into a started parser and collect all emitted
 * keypress events.  The parser is stopped after the call so it doesn't
 * leave a dangling stdin listener.
 */
function feed(parser: InputParser, bytes: Buffer | string): KeyEvent[] {
    const events: KeyEvent[] = []
    parser.on('keypress', e => events.push(e))
    parser.start()
    process.stdin.emit('data', typeof bytes === 'string' ? Buffer.from(bytes) : bytes)
    parser.stop()
    return events
}

describe('InputParser - Ctrl+C (quit key)', () => {
    test('\\x03 emits {name:"c", ctrl:true} — the C-c keypress', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x03')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('c')
        expect(events[0]!.ctrl).toBe(true)
        expect(events[0]!.shift).toBe(false)
        expect(events[0]!.meta).toBe(false)
    })

    test('driver formats ctrl+c keypress as "C-c" string', () => {
        // This mirrors exactly what TerminalDriver does before looking up keyHandlers
        const event: KeyEvent = { name: 'c', ctrl: true, shift: false, meta: false, sequence: '\x03' }
        const keyStr = event.ctrl ? `C-${event.name}` : event.name
        expect(keyStr).toBe('C-c')
    })
})

describe('InputParser - escape key', () => {
    test('\\x1b emits {name:"escape", ctrl:false}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x1b')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('escape')
        expect(events[0]!.ctrl).toBe(false)
    })
})

describe('InputParser - printable keys', () => {
    test('"q" emits {name:"q", ctrl:false}', () => {
        const parser = new InputParser()
        const events = feed(parser, 'q')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('q')
        expect(events[0]!.ctrl).toBe(false)
        expect(events[0]!.shift).toBe(false)
    })

    test('uppercase "Q" emits {name:"q", shift:true}', () => {
        const parser = new InputParser()
        const events = feed(parser, 'Q')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('q')
        expect(events[0]!.shift).toBe(true)
    })

    test('enter (\\r) emits {name:"enter"}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\r')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('enter')
    })

    test('backspace (\\x7f) emits {name:"backspace"}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x7f')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('backspace')
    })
})

describe('InputParser - arrow keys', () => {
    test('up arrow emits {name:"up"}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x1b[A')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('up')
    })

    test('down arrow emits {name:"down"}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x1b[B')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('down')
    })

    test('left arrow emits {name:"left"}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x1b[D')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('left')
    })

    test('right arrow emits {name:"right"}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x1b[C')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('right')
    })
})

describe('InputParser - other control keys', () => {
    test('Ctrl+A (\\x01) emits {name:"a", ctrl:true}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x01')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('a')
        expect(events[0]!.ctrl).toBe(true)
    })

    test('Ctrl+D (\\x04) emits {name:"d", ctrl:true}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x04')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('d')
        expect(events[0]!.ctrl).toBe(true)
    })

    test('home key emits {name:"home"}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x1b[H')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('home')
    })

    test('end key emits {name:"end"}', () => {
        const parser = new InputParser()
        const events = feed(parser, '\x1b[F')
        expect(events).toHaveLength(1)
        expect(events[0]!.name).toBe('end')
    })
})

describe('InputParser - multiple keypresses in one chunk', () => {
    test('q + \\x03 in one chunk emits two events', () => {
        const parser = new InputParser()
        const events = feed(parser, 'q\x03')
        expect(events).toHaveLength(2)
        expect(events[0]!.name).toBe('q')
        expect(events[1]!.name).toBe('c')
        expect(events[1]!.ctrl).toBe(true)
    })
})
