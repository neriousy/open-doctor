// Searchable action launcher for common Open Doctor tools.
import { Box, Text } from "../ui/primitives.js"

export type CommandPaletteItem = {
  id: string
  title: string
  category: string
  status: string
  actionHint: string
}

export function CommandPalette(props: {
  query: string
  items: CommandPaletteItem[]
  selected: number
}) {
  return (
    <Box
      id="command-palette"
      position="absolute"
      top="10%"
      left="15%"
      width="70%"
      border
      borderColor="#c3e88d"
      padding={1}
      backgroundColor="#101820"
      flexDirection="column"
    >
      <Text fg="#c3e88d" height={1}>
        Command palette
      </Text>
      <Text fg="#9fb3c8" height={1}>
        {`> ${props.query}`}
      </Text>
      <Box marginTop={1} flexDirection="column">
        {props.items.length === 0 ? (
          <Text fg="#7893ad" height={1}>
            No matching tools or actions
          </Text>
        ) : (
          props.items.slice(0, 9).map((item, index) => (
            <Box key={item.id} height={2} paddingLeft={1} backgroundColor={index === props.selected ? "#17202a" : "#101820"}>
              <Text fg={index === props.selected ? "#c3e88d" : "#d6deeb"} height={1}>
                {formatResult(item, index === props.selected)}
              </Text>
              <Text fg="#7893ad" height={1}>
                {item.actionHint}
              </Text>
            </Box>
          ))
        )}
      </Box>
      <Text fg="#7893ad" height={1}>
        Type to filter - Enter open - Esc close
      </Text>
    </Box>
  )
}

function formatResult(item: CommandPaletteItem, selected: boolean) {
  const marker = selected ? ">" : " "
  return `${marker} ${truncate(item.title, 24).padEnd(24, " ")} ${truncate(item.category, 10).padEnd(10, " ")} ${truncate(item.status, 28)}`
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}
