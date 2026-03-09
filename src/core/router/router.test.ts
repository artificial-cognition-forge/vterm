import { test, expect, describe } from 'bun:test'
import { createRenderer, defineComponent, h, nextTick } from '@vue/runtime-core'
import { createRouter, installRouter } from './router'
import { useRouter, useRoute } from './composables'
import { RouterView } from './components'
import { matchRoute, parseQuery } from './matcher'

// Minimal no-op renderer for Bun (no DOM required)
const { createApp } = createRenderer<any, any>({
    createElement: (tag) => ({ tag, children: [], props: {} }),
    createText: (text) => ({ text }),
    createComment: (text) => ({ comment: text }),
    setText: () => {},
    setElementText: () => {},
    patchProp: () => {},
    insert: () => {},
    remove: () => {},
    parentNode: () => null,
    nextSibling: () => null,
    querySelector: () => null,
    setScopeId: () => {},
    cloneNode: (n) => ({ ...n }),
    insertStaticContent: () => [null, null],
})

// ---------------------------------------------------------------------------
// matchRoute
// ---------------------------------------------------------------------------

describe('matchRoute', () => {
    test('matches root path', () => {
        expect(matchRoute('/', '/').match).toBe(true)
        expect(matchRoute('/', '/').params).toEqual({})
    })

    test('matches exact path', () => {
        expect(matchRoute('/hello', '/hello').match).toBe(true)
        expect(matchRoute('/hello', '/world').match).toBe(false)
    })

    test('matches named params', () => {
        const result = matchRoute('/users/:id', '/users/42')
        expect(result.match).toBe(true)
        expect(result.params).toEqual({ id: '42' })
    })

    test('matches multiple params', () => {
        const result = matchRoute('/users/:id/posts/:postId', '/users/1/posts/99')
        expect(result.match).toBe(true)
        expect(result.params).toEqual({ id: '1', postId: '99' })
    })

    test('no match on segment count mismatch', () => {
        expect(matchRoute('/a/b', '/a').match).toBe(false)
        expect(matchRoute('/a', '/a/b').match).toBe(false)
    })

    test('ignores query string when matching', () => {
        expect(matchRoute('/hello', '/hello?foo=bar').match).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// parseQuery
// ---------------------------------------------------------------------------

describe('parseQuery', () => {
    test('returns empty object when no query string', () => {
        expect(parseQuery('/hello')).toEqual({})
    })

    test('parses single key-value pair', () => {
        expect(parseQuery('/hello?foo=bar')).toEqual({ foo: 'bar' })
    })

    test('parses multiple key-value pairs', () => {
        expect(parseQuery('/hello?a=1&b=2')).toEqual({ a: '1', b: '2' })
    })

    test('decodes URI components', () => {
        expect(parseQuery('/search?q=hello%20world')).toEqual({ q: 'hello world' })
    })

    test('handles key with no value', () => {
        expect(parseQuery('/hello?flag=')).toEqual({ flag: '' })
    })
})

// ---------------------------------------------------------------------------
// createRouter
// ---------------------------------------------------------------------------

describe('createRouter', () => {
    test('starts at root path', () => {
        const { router } = createRouter([])
        expect(router.currentPath.value).toBe('/')
    })

    test('push navigates to a new path', () => {
        const { router } = createRouter([])
        router.push('/about')
        expect(router.currentPath.value).toBe('/about')
    })

    test('replace updates current path without extending history', () => {
        const { router } = createRouter([])
        router.push('/a')
        router.replace('/b')
        expect(router.currentPath.value).toBe('/b')
        // back() should go to '/' (the initial entry), not '/a'
        router.back()
        expect(router.currentPath.value).toBe('/')
    })

    test('back navigates to previous path', () => {
        const { router } = createRouter([])
        router.push('/a')
        router.push('/b')
        router.back()
        expect(router.currentPath.value).toBe('/a')
    })

    test('back does nothing at history root', () => {
        const { router } = createRouter([])
        router.back()
        expect(router.currentPath.value).toBe('/')
    })

    test('currentRoute reflects matched route params', () => {
        const { router } = createRouter([
            { path: '/users/:id', name: 'user' },
        ])
        router.push('/users/42')
        expect(router.currentRoute.value.params).toEqual({ id: '42' })
    })

    test('currentRoute reflects query string', () => {
        const { router } = createRouter([])
        router.push('/search?q=bun')
        expect(router.currentRoute.value.query).toEqual({ q: 'bun' })
    })
})

// ---------------------------------------------------------------------------
// installRouter / useRouter / useRoute (Vue inject integration)
// ---------------------------------------------------------------------------

describe('useRouter / useRoute', () => {
    function makeApp(routes: any[], callback: (results: any) => void) {
        let captured: any = null

        const TestComponent = defineComponent({
            setup() {
                captured = {
                    router: useRouter(),
                    route: useRoute(),
                }
                return () => null
            },
        })

        const app = createApp(TestComponent)
        app.config.warnHandler = () => {}
        installRouter(app, routes)
        app.mount({} as any)

        callback(captured)
        app.unmount()
    }

    test('useRouter returns the installed router', () => {
        makeApp([], ({ router }) => {
            expect(router).toBeDefined()
            expect(typeof router.push).toBe('function')
        })
    })

    test('useRoute returns current route match', () => {
        makeApp([], ({ route }) => {
            expect(route.value).toMatchObject({ path: '/', params: {}, query: {} })
        })
    })

    test('useRouter throws when no router is installed', () => {
        const TestComponent = defineComponent({
            setup() {
                expect(() => useRouter()).toThrow('useRouter must be called within a router context')
                return () => null
            },
        })
        const app = createApp(TestComponent)
        app.config.warnHandler = () => {}
        app.mount({} as any)
        app.unmount()
    })

    test('navigation via useRouter updates useRoute', () => {
        makeApp([{ path: '/settings', name: 'settings' }], ({ router, route }) => {
            router.push('/settings')
            expect(route.value.path).toBe('/settings')
        })
    })
})

// ---------------------------------------------------------------------------
// RouterView
// ---------------------------------------------------------------------------

describe('RouterView', () => {
    function mountWithRouter(routes: any[]) {
        const rendered: string[] = []

        const Root = defineComponent({
            setup() {
                return () => h(RouterView)
            },
        })

        const app = createApp(Root)
        app.config.warnHandler = () => {}
        const router = installRouter(app, routes)
        app.mount({} as any)

        return { router, app }
    }

    test('renders matched route component', () => {
        let didRender = false
        const HelloPage = defineComponent({ setup() { didRender = true; return () => null } })

        const { app } = mountWithRouter([{ path: '/', component: HelloPage }])
        expect(didRender).toBe(true)
        app.unmount()
    })

    test('switches component on navigation', async () => {
        const renders: string[] = []
        const PageA = defineComponent({ setup() { renders.push('A'); return () => null } })
        const PageB = defineComponent({ setup() { renders.push('B'); return () => null } })

        const { router, app } = mountWithRouter([
            { path: '/', component: PageA },
            { path: '/b', component: PageB },
        ])

        router.push('/b')
        await nextTick()
        expect(renders).toContain('B')
        app.unmount()
    })
})
