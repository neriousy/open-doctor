import { useTerminalDimensions } from "@opentui/react"

export function useResponsiveLayout() {
  const { width, height } = useTerminalDimensions()
  return {
    width,
    height,
    showDetailPanel: width >= 118,
    showLogSourcePanel: width >= 112,
    compact: width < 100,
  }
}
