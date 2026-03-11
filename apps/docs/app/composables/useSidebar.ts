import { ref, computed } from "@arcforge/vterm"

type SidebarState = {
    page: "html" | "css" | "vue"
}

export function useSidebar() {
    const state = ref<SidebarState>({
        page: "html"
    })

    return {
        set: (page: SidebarState["page"]) => {
            state.value.page = page
        },

        page: computed(() => {
            return state.value.page
        }),

        state: state,
    }
}