import { useState } from "react"
import { SIDEBAR_ITEMS } from "../navigation.js"
import type { SidebarSection, View } from "../types.js"
import { useRoute } from "../context/route.js"
import { Sidebar } from "./primitives.js"

export function WorkspaceSidebar(props: { selected: SidebarSection; focused?: boolean }) {
  const route = useRoute()
  const [hovered, setHovered] = useState<SidebarSection | null>(null)
  const sidebarProps = {
    items: SIDEBAR_ITEMS.map((item) => ({ id: item, label: item })),
    selected: props.selected,
    hovered,
    onHover: setHovered,
    onSelect: route.actions.openSection,
  }

  if (props.focused === undefined) return <Sidebar {...sidebarProps} />
  return <Sidebar {...sidebarProps} focused={props.focused} />
}

export function sectionForView(view: View): SidebarSection {
  if (view === "logs") return "Logs"
  if (view === "archived") return "Sessions"
  if (view === "repair-detail") return "Repairs"
  if (view === "data" || view === "backups") return "Data"
  if (view === "config") return "Config"
  if (view === "settings") return "Settings"
  return "Overview"
}
