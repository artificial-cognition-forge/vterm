import { ref, reactive, onUnmounted } from "vue"

export interface ProcessHandle {
    lines: string[]
    stdout: string
    stderr: string[]
    status: 'running' | 'exited' | 'error'
    exitCode: number | null
    send: (text: string) => void
    kill: (signal?: string) => void
}

export interface UseProcessOptions {
    /** Max lines to keep in the lines buffer (default: 1000) */
    maxLines?: number
    /** Whether to merge stderr into lines (default: true) */
    mergeStderr?: boolean
}

export function useProcess(options: UseProcessOptions = {}) {
    const { maxLines = 1000, mergeStderr = true } = options

    const handles: Array<{ proc: ReturnType<typeof Bun.spawn>; killed: { value: boolean } }> = []

    function spawn(cmd: string, args: string[] = [], env?: Record<string, string>): ProcessHandle {
        const lines = ref<string[]>([])
        const stdout = ref('')
        const stderr = ref<string[]>([])
        const status = ref<'running' | 'exited' | 'error'>('running')
        const exitCode = ref<number | null>(null)
        const killed = { value: false }

        let proc: ReturnType<typeof Bun.spawn>
        try {
            proc = Bun.spawn([cmd, ...args], {
                stdout: 'pipe',
                stderr: 'pipe',
                stdin: 'pipe',
                env: env ? { ...process.env, ...env } : process.env,
            })
        } catch (err) {
            status.value = 'error'
            lines.value = [`[error] Failed to spawn: ${err}`]
            return reactive({ lines, stdout, stderr, status, exitCode, send: () => {}, kill: () => {} })
        }

        handles.push({ proc, killed })

        const decoder = new TextDecoder()
        let stdoutCarry = ''
        let stderrCarry = ''

        function pushLines(target: ReturnType<typeof ref<string[]>>, text: string, carry: string): string {
            const combined = carry + text
            const parts = combined.split('\n')
            const remaining = parts.pop() ?? ''
            const newLines = parts.filter(l => l.length > 0)
            if (newLines.length > 0) {
                target.value = [...target.value, ...newLines].slice(-maxLines)
            }
            return remaining
        }

        // stdout reader loop
        ;(async () => {
            try {
                const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader()
                while (!killed.value) {
                    const { value, done } = await reader.read()
                    if (done) break
                    const text = decoder.decode(value)
                    stdout.value = text
                    stdoutCarry = pushLines(lines, text, stdoutCarry)
                }
            } catch {
                // stream closed
            }
        })()

        // stderr reader loop
        ;(async () => {
            try {
                const reader = (proc.stderr as ReadableStream<Uint8Array>).getReader()
                while (!killed.value) {
                    const { value, done } = await reader.read()
                    if (done) break
                    const text = decoder.decode(value)
                    stderrCarry = pushLines(stderr, text, stderrCarry)
                    if (mergeStderr) {
                        stderrCarry = pushLines(lines, text, stderrCarry)
                    }
                }
            } catch {
                // stream closed
            }
        })()

        // Wait for exit
        ;(async () => {
            try {
                exitCode.value = await proc.exited
                status.value = 'exited'
            } catch {
                status.value = 'error'
            }
        })()

        function send(text: string) {
            if (status.value === 'running') {
                const encoder = new TextEncoder()
                proc.stdin!.write(encoder.encode(text))
            }
        }

        function kill(signal = 'SIGTERM') {
            if (status.value === 'running') {
                killed.value = true
                proc.kill(signal as NodeJS.Signals)
            }
        }

        return reactive({ lines, stdout, stderr, status, exitCode, send, kill })
    }

    function killAll() {
        for (const { proc, killed } of handles) {
            try {
                killed.value = true
                proc.kill()
            } catch {
                // already dead
            }
        }
    }

    onUnmounted(() => {
        killAll()
    })

    return { spawn, killAll }
}
