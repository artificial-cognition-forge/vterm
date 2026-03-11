import type { ElementBehavior } from './types'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent } from '../terminal/input'
import { registerElement } from './registry'
import { getGlobalRouter } from '../../core/router/router'
import { spawnSync } from 'child_process'

function openExternal(url: string): void {
    const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
    spawnSync(cmd, [url], { detached: true, stdio: 'ignore' })
}

const anchorBehavior: ElementBehavior = {
    handleKey(node: LayoutNode, key: KeyEvent, requestRender: () => void): void {
        if (key.name === 'enter' || key.name === 'return') {
            const href = node.props.href
            if (href) {
                if (/^https?:\/\//.test(href)) {
                    openExternal(href)
                } else {
                    const router = getGlobalRouter()
                    if (router) {
                        router.push(href)
                        requestRender()
                    }
                }
            }
        }
    },

    getCursorPos(): null {
        return null
    },
}

registerElement('a', anchorBehavior)
