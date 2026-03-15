/**
 * Terminal-specific Vue directives shared between dev (sfc-loader) and prod
 * (vterm-prod) runtimes. No compiler dependencies.
 */

let _requestRender: (() => void) | null = null

export function setDirectiveRenderCallback(fn: () => void): void {
    _requestRender = fn
}

/**
 * v-model directive for terminal <input> and <textarea> elements.
 * Syncs binding value to node._inputValue so programmatic resets are reflected.
 */
export const vModelText = {
    beforeMount(el: any, binding: any) {
        const val = String(binding.value ?? '')
        el._inputValue = val
        el._cursorPos = val.length
    },
    mounted() {},
    beforeUpdate() {},
    updated(el: any, binding: any) {
        const newVal = String(binding.value ?? '')
        if (el._inputValue !== newVal) {
            el._inputValue = newVal
            el._cursorPos = newVal.length
            _requestRender?.()
        }
    },
}

export const vModelCheckbox = { beforeMount() {}, mounted() {}, beforeUpdate() {}, updated() {} }
export const vModelRadio    = { beforeMount() {}, mounted() {}, beforeUpdate() {}, updated() {} }
export const vModelSelect   = { beforeMount() {}, mounted() {}, beforeUpdate() {}, updated() {} }
export const vModelDynamic  = { beforeMount() {}, mounted() {}, beforeUpdate() {}, updated() {} }
