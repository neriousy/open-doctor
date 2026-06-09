import { useRef, useState } from "react"
import type { CommandPaletteAction } from "../routes/overview/actions.js"
import { filteredCommandItems } from "../routes/overview/actions.js"
import { boundedIndex } from "../util/indexing.js"

export function useCommandPalette(
  items: CommandPaletteAction[],
  options: {
    quit: () => void
    setStatus: (status: string) => void
  },
) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState("")
  const paletteQueryRef = useRef("")
  const [paletteSelectedIndex, setPaletteSelectedIndex] = useState(0)
  const visibleCommandItems = filteredCommandItems(items, paletteQuery)
  const paletteSelected = boundedIndex(paletteSelectedIndex, visibleCommandItems.length)

  function openCommandPalette() {
    setPaletteOpen(true)
    paletteQueryRef.current = ""
    setPaletteQuery("")
    setPaletteSelectedIndex(0)
    options.setStatus("Command palette: type to filter, Enter to open, Esc to close")
  }

  function closeCommandPalette() {
    setPaletteOpen(false)
    paletteQueryRef.current = ""
    setPaletteQuery("")
    setPaletteSelectedIndex(0)
    options.setStatus("Command palette closed")
  }

  function handlePaletteKey(key: { name?: string; sequence?: string }) {
    const sequence = key.sequence ?? ""
    if (sequence === "\u0003") {
      options.quit()
      return
    }
    if (key.name === "escape" || sequence === "\u001b") {
      closeCommandPalette()
      return
    }
    if (key.name === "up" || key.name === "k") {
      moveCommandPalette(-1)
      return
    }
    if (key.name === "down" || key.name === "j") {
      moveCommandPalette(1)
      return
    }
    if (key.name === "return" || key.name === "enter" || sequence === "\r" || sequence === "\n") {
      runSelectedCommandPaletteItem()
      return
    }
    if (key.name === "backspace" || key.name === "delete" || sequence === "\u007f") {
      const next = paletteQueryRef.current.slice(0, -1)
      paletteQueryRef.current = next
      setPaletteQuery(next)
      setPaletteSelectedIndex(0)
      return
    }
    if (sequence.length === 1 && sequence >= " ") {
      const next = `${paletteQueryRef.current}${sequence}`
      paletteQueryRef.current = next
      setPaletteQuery(next)
      setPaletteSelectedIndex(0)
    }
  }

  function moveCommandPalette(direction: 1 | -1) {
    if (visibleCommandItems.length === 0) return
    setPaletteSelectedIndex((current) => boundedIndex(current + direction, visibleCommandItems.length))
  }

  function runSelectedCommandPaletteItem() {
    const command = visibleCommandItems[paletteSelected]
    if (!command) return
    setPaletteOpen(false)
    paletteQueryRef.current = ""
    setPaletteQuery("")
    setPaletteSelectedIndex(0)
    command.run()
  }

  return {
    paletteOpen,
    paletteQuery,
    paletteSelected,
    visibleCommandItems,
    openCommandPalette,
    handlePaletteKey,
  }
}
