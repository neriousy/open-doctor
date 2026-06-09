import { useState } from "react"
import { SIDEBAR_ITEMS } from "../navigation.js"
import type { SidebarSection, View } from "../types.js"
import { useRoute } from "../context/route.js"
import { Sidebar } from "./primitives.js"

export function WorkspaceSidebar(props: { selected: SidebarSection; focused?: boolean }) {
  const route = useRoute()
  const [hovered, setHovered] = useState<SidebarSection | null>(null)

  const sidebar = (
    <Sidebar
      items={SIDEBAR_ITEMS.map((item) => ({ id: item, label: item }))}
      selected={props.selected}
      hovered={hovered}
      onHover={setHovered}
      onSelect={(section) => {
        if (section === "Overview") route.actions.goOverview()
        if (section === "Logs") route.actions.openLogs()
        if (section === "Sessions") route.actions.openArchivedSessions()
        if (section === "Data") route.actions.openData()
        if (section === "Config") route.actions.openConfig()
        if (section === "Settings") route.actions.openSettings()
      }}
    />
  )

  if (props.focused === undefined) return sidebar
  return (
    <Sidebar
      items={SIDEBAR_ITEMS.map((item) => ({ id: item, label: item }))}
      selected={props.selected}
      focused={props.focused}
      hovered={hovered}
      onHover={setHovered}
      onSelect={(section) => {
        if (section === "Overview") route.actions.goOverview()
        if (section === "Logs") route.actions.openLogs()
        if (section === "Sessions") route.actions.openArchivedSessions()
        if (section === "Data") route.actions.openData()
        if (section === "Config") route.actions.openConfig()
        if (section === "Settings") route.actions.openSettings()
      }}
    />
  )
}

export function sectionForView(view: View): SidebarSection {
  if (view === "logs") return "Logs"
  if (view === "archived") return "Sessions"
  if (view === "data" || view === "repair-detail" || view === "backups") return "Data"
  if (view === "config") return "Config"
  if (view === "settings") return "Settings"
  return "Overview"
}
