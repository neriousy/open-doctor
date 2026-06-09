// Contextual keyboard help overlay for the TUI shell.
import { Box, Text } from "../ui/primitives.js"

export type HelpContext = {
  screen: "Overview" | "Repairs" | "Sessions" | "Logs" | "Backups"
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
      borderColor="#82aaff"
      padding={1}
      backgroundColor="#101820"
      flexDirection="column"
    >
      <Text fg="#82aaff" height={1}>
        {`Help - ${props.context.screen}`}
      </Text>

      <HelpSection title="Navigation" items={["↑↓ move", "←→ switch pane", "Enter open", "Esc back", "q quit", "? help"]} />
      <HelpSection title="Actions" items={props.context.actions} />
      <HelpSection title="Safety" items={props.context.safety} />

      <Text fg="#7893ad" height={1}>
        Esc closes help and returns to the same focused item.
      </Text>
    </Box>
  )
}

function HelpSection(props: { title: string; items: string[] }) {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text fg="#d6deeb" height={1}>
        {props.title}
      </Text>
      {props.items.map((item) => (
        <Text key={item} fg="#9fb3c8" height={1}>
          {`- ${item}`}
        </Text>
      ))}
    </Box>
  )
}
