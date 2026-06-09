// Contextual keyboard help overlay for the TUI shell.
import { Box, Text } from "../ui/primitives.js"
import type { SidebarSection } from "../types.js"
import { TUI } from "../ui/primitives-model.js"

export type HelpContext = {
  screen: SidebarSection
  actions: string[]
  safety: string[]
}

export function HelpOverlay(props: { context: HelpContext }) {
  return (
    <Box
      id="help-overlay"
      position="absolute"
      top="12%"
      left="18%"
      width="64%"
      border
      borderColor={TUI.borderActive}
      padding={1}
      backgroundColor={TUI.panel}
      flexDirection="column"
    >
      <Text fg={TUI.blue} height={1}>
        {`Help - ${props.context.screen}`}
      </Text>

      <HelpSection title="Navigation" items={["↑↓ move", "←→ switch pane", "Enter open", "Esc back", "q quit", "? help"]} />
      <HelpSection title="Actions" items={props.context.actions} />
      <HelpSection title="Safety" items={props.context.safety} />

      <Text fg={TUI.dim} height={1}>
        Esc closes help and returns to the same focused item.
      </Text>
    </Box>
  )
}

function HelpSection(props: { title: string; items: string[] }) {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text fg={TUI.text} height={1}>
        {props.title}
      </Text>
      {props.items.map((item) => (
        <Text key={item} fg={TUI.muted} height={1}>
          {`- ${item}`}
        </Text>
      ))}
    </Box>
  )
}
