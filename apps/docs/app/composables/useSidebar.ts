import { ref, computed } from "@arcforge/vterm"

type SidebarState = {
    page: "html" | "css"
}

export function useSidebar() {
    const state = ref<SidebarState>({
        page: "css"
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