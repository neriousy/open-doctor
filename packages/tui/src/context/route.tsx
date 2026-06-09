import { useState } from "react"
import type { SidebarSection, View } from "../types.js"
import { createStateContext } from "./helper.js"

export type RouteContext = {
  location: {
    view: View
  }
  flags: {
    restoreImplemented: boolean
  }
  actions: {
    quit: () => void
    goOverview: () => void
    openData: () => void
    openConfig: () => void
    openRepairDetail: () => void
    openArchivedSessions: () => void
    openLogs: () => void
    openBackups: () => void
    openSettings: () => void
    openSection: (section: SidebarSection) => void
  }
}

const context = createStateContext<RouteContext, { onExit: () => void }>({
  name: "Route",
  init: (props) => {
    const [view, setView] = useState<View>("overview")
    const restoreImplemented = false

    function quit() {
      props.onExit()
    }

    function goOverview() {
      setView("overview")
    }

    function openData() {
      setView("data")
    }

    function openConfig() {
      setView("config")
    }

    function openRepairDetail() {
      setView("repair-detail")
    }

    function openLogs() {
      setView("logs")
    }

    function openBackups() {
      setView("backups")
    }

    function openArchivedSessions() {
      setView("archived")
    }

    function openSettings() {
      setView("settings")
    }

    function openSection(section: SidebarSection) {
      if (section === "Overview") return goOverview()
      if (section === "Logs") return openLogs()
      if (section === "Sessions") return openArchivedSessions()
      if (section === "Repairs") return openRepairDetail()
      if (section === "Data") return openData()
      if (section === "Config") return openConfig()
      if (section === "Settings") return openSettings()
    }

    return {
      location: {
        view,
      },
      flags: {
        restoreImplemented,
      },
      actions: {
        quit,
        goOverview,
        openData,
        openConfig,
        openRepairDetail,
        openArchivedSessions,
        openLogs,
        openBackups,
        openSettings,
        openSection,
      },
    }
  },
})

export const RouteProvider = context.Provider
export const useRoute = context.useValue
