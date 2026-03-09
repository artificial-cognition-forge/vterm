/**
 * Tests for TerminalDriver key dispatch
 *
 * Verifies the path: InputParser keypress → driver.key() handler fires.
 * This is the critical path for quit keys (C-c, escape, q) in raw mode.
 *
 * We do NOT call driver.initialize() so no TTY is needed.
 * We do NOT call process.exit() in tests — we verify the handler fires,
 * which is sufficient to prove the quit key path is wired correctly.
 */

import { test, expect, describe, afterEach, beforeAll } from 'bun:test'
import { TerminalDriver } from './driver'
import { InputParser } from './input'
import type { KeyEvent } from './input'

// Each TerminalDriver adds a resize listener to process.stdout.
// Raise the limit so tests don't produce MaxListeners warnings.
beforeAll(() => { process.stdout.setMaxListeners(100) })

function makeKey(name: string, ctrl = false): KeyEvent {
    return { name, sequence: '', ctrl, shift: false, meta: false }
}

describe('TerminalDriver key dispatch', () => {
    test('registered handler fires when inputParser emits matching keypress', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        let fired = false
        driver.key('C-c', () => { fired = true })

        // Simulate: InputParser parsed \x03 and emitted the keypress event
        parser.emit('keypress', makeKey('c', true))

        expect(fired).toBe(true)
        driver.destroy()
    })

    test('C-c keypress fires handler (ctrl+c → "C-c" format)', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        const calls: string[] = []
        driver.key('C-c', () => calls.push('quit'))

        parser.emit('keypress', makeKey('c', true))

        expect(calls).toEqual(['quit'])
        driver.destroy()
    })

    test('escape keypress fires handler', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        let fired = false
        driver.key('escape', () => { fired = true })

        parser.emit('keypress', makeKey('escape'))

        expect(fired).toBe(true)
        driver.destroy()
    })

    test('"q" keypress fires handler', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        let fired = false
        driver.key('q', () => { fired = true })

        parser.emit('keypress', makeKey('q'))

        expect(fired).toBe(true)
        driver.destroy()
    })

    test('array of quit keys all fire the same handler', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        const calls: string[] = []
        driver.key(['escape', 'q', 'C-c'], () => calls.push('quit'))

        parser.emit('keypress', makeKey('escape'))
        parser.emit('keypress', makeKey('q'))
        parser.emit('keypress', makeKey('c', true))

        expect(calls).toEqual(['quit', 'quit', 'quit'])
        driver.destroy()
    })

    test('unregistered key does not fire handler', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        let fired = false
        driver.key('C-c', () => { fired = true })

        parser.emit('keypress', makeKey('q')) // not C-c

        expect(fired).toBe(false)
        driver.destroy()
    })

    test('multiple handlers for same key all fire', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        const calls: number[] = []
        driver.key('C-c', () => calls.push(1))
        driver.key('C-c', () => calls.push(2))

        parser.emit('keypress', makeKey('c', true))

        expect(calls).toContain(1)
        expect(calls).toContain(2)
        driver.destroy()
    })

    test('unkey removes a specific handler', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        let fired = false
        const handler = () => { fired = true }
        driver.key('C-c', handler)
        driver.unkey('C-c', handler)

        parser.emit('keypress', makeKey('c', true))

        expect(fired).toBe(false)
        driver.destroy()
    })

    test('unkey only removes the specified handler, not others', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        let fired1 = false
        let fired2 = false
        const handler1 = () => { fired1 = true }
        const handler2 = () => { fired2 = true }
        driver.key('C-c', handler1)
        driver.key('C-c', handler2)
        driver.unkey('C-c', handler1)

        parser.emit('keypress', makeKey('c', true))

        expect(fired1).toBe(false)
        expect(fired2).toBe(true)
        driver.destroy()
    })
})

describe('TerminalDriver - quit key chain (InputParser → driver → handler)', () => {
    test('\\x03 byte through InputParser triggers C-c handler in driver', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        let quitCalled = false
        driver.key('C-c', () => { quitCalled = true })

        // Simulate the actual byte that Ctrl+C sends in raw mode
        parser.start()
        process.stdin.emit('data', Buffer.from('\x03'))
        parser.stop()

        expect(quitCalled).toBe(true)
        driver.destroy()
    })

    test('escape byte through InputParser triggers escape handler', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        let quitCalled = false
        driver.key('escape', () => { quitCalled = true })

        parser.start()
        process.stdin.emit('data', Buffer.from('\x1b'))
        parser.stop()

        expect(quitCalled).toBe(true)
        driver.destroy()
    })

    test('"q" byte through InputParser triggers q handler', () => {
        const parser = new InputParser()
        const driver = new TerminalDriver({ inputParser: parser })
        let quitCalled = false
        driver.key('q', () => { quitCalled = true })

        parser.start()
        process.stdin.emit('data', Buffer.from('q'))
        parser.stop()

        expect(quitCalled).toBe(true)
        driver.destroy()
    })
})
