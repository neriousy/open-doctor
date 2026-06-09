import type { Dispatch, SetStateAction } from "react"
import { useState } from "react"
import { useCommandPalette } from "../component/use-command-palette.js"
import type { CommandPaletteAction } from "../routes/overview/actions.js"
import { commandPaletteItems } from "../routes/overview/actions.js"
import { useBackups } from "./backups.js"
import { useHealth } from "./health.js"
import { createStateContext } from "./helper.js"
import { useOverview } from "./overview.js"
import { useRoute } from "./route.js"

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

const context = createStateContext<OverlaysContext>({
  name: "Overlays",
  init: () => {
    const [helpOpen, setHelpOpen] = useState(false)
    const route = useRoute()
    const health = useHealth()
    const backups = useBackups()
    const overview = useOverview()
    const commandItems = commandPaletteItems(health.snapshot, {
      openRepairDetail: route.actions.openRepairDetail,
      openArchivedSessions: route.actions.openArchivedSessions,
      openLogs: route.actions.openLogs,
      openBackups: route.actions.openBackups,
      openSettings: () => {
        route.actions.openSettings()
        overview.section.select("Settings")
      },
      requestCreateBackupConfirmation: backups.actions.create,
      refreshHealth: health.actions.refresh,
    })
    const { paletteOpen, paletteQuery, paletteSelected, visibleCommandItems, openCommandPalette, handlePaletteKey } = useCommandPalette(commandItems, {
      quit: route.actions.quit,
      setStatus: health.status.set,
    })

    return {
      help: {
        open: helpOpen,
        setOpen: setHelpOpen,
      },
      palette: {
        open: paletteOpen,
        query: paletteQuery,
        items: visibleCommandItems,
        selected: paletteSelected,
        openPalette: openCommandPalette,
        handleKey: handlePaletteKey,
      },
    }
  },
})

export const OverlaysProvider = context.Provider
export const useOverlays = context.useValue
