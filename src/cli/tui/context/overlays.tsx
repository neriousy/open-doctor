import type { Dispatch, SetStateAction } from "react"
import type { CommandPaletteAction } from "../routes/overview/actions.js"
import { createRequiredContext } from "./helper.js"

export type OverlaysContext = {
  help: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
  }
  palette: {
    open: boolean
    query: string
    items: CommandPaletteAction[]
    selected: number
    openPalette: () => void
    handleKey: (key: { name?: string; sequence?: string }) => void
  }
}

const context = createRequiredContext<OverlaysContext>("Overlays")

export const OverlaysProvider = context.Provider
export const useOverlays = context.useValue
