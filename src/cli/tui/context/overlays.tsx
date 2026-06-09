import type { Dispatch, SetStateAction } from "react"
import type { CommandPaletteAction } from "../routes/overview/actions.js"
import { createRequiredContext } from "./helper.js"

export type OverlaysContext = {
  helpOpen: boolean
  setHelpOpen: Dispatch<SetStateAction<boolean>>
  paletteOpen: boolean
  paletteQuery: string
  visibleCommandItems: CommandPaletteAction[]
  paletteSelected: number
  openCommandPalette: () => void
  handlePaletteKey: (key: { name?: string; sequence?: string }) => void
}

const context = createRequiredContext<OverlaysContext>("Overlays")

export const OverlaysProvider = context.Provider
export const useOverlays = context.useValue
