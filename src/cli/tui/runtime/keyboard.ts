import type { ReactNode } from "react"
import type { View } from "../types.js"

export type KeyInput = {
  name?: string
  sequence?: string
}

export type ScreenRoute = {
  id: View
  render: () => ReactNode
  onKey?: (key: KeyInput) => void
}

export function handleRouteKey(view: View, routes: ScreenRoute[], key: KeyInput) {
  const route = routes.find((candidate) => candidate.id === view)
  if (!route?.onKey) return false
  route.onKey(key)
  return true
}
