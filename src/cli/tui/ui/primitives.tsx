// Shared OpenTUI layout and display primitives.
import type { BoxProps, TextProps } from "@opentui/react"
import { createElement, type ReactNode } from "react"
import { shortenPath, statusColor, TUI } from "./primitives-model.js"
import type { DetailsSection, EmptyStateAction, SidebarItem, StatusKind } from "./primitives-model.js"

export function Box(props: BoxProps) {
  return createElement("box", props)
}

export function Text(props: TextProps) {
  return createElement("text", props)
}

export function AppShell(props: {
  header: ReactNode
  sidebar?: ReactNode
  main: ReactNode
  details?: ReactNode
  footer: ReactNode
  overlays?: ReactNode
}) {
  return (
    <Box id="root" flexDirection="column" width="100%" height="100%" padding={1} backgroundColor={TUI.bg}>
      {props.header}
      <Box id="app-body" flexGrow={1} flexShrink={1} flexDirection="row" columnGap={1}>
        {props.sidebar}
        <Box id="app-main" flexGrow={1} flexShrink={1} flexDirection="column">
          {props.main}
        </Box>
        {props.details}
      </Box>
      {props.footer}
      {props.overlays}
    </Box>
  )
}

export function HeaderStatus(props: {
  title: string
  dataPath: string
  repairCount: number
  archivedCount: number
  logErrorCount: number
  backupStatus: string
}) {
  return (
    <Box id="header" height={5} border borderColor={TUI.border} paddingLeft={2} paddingRight={2} paddingTop={1}>
      <Text id="title" fg={TUI.text} height={1}>
        {props.title}
      </Text>
      <Text id="subtitle" fg={TUI.dim} height={1}>
        {`${shortenPath(props.dataPath, 72)} | Repairs: ${props.repairCount} | Archived: ${props.archivedCount} | Log errors: ${props.logErrorCount} | Backup: ${props.backupStatus}`}
      </Text>
    </Box>
  )
}

export function MainPanel(props: { id?: string; title?: string; summary?: string; focused?: boolean; children: ReactNode }) {
  return (
    <Box
      id={props.id ?? "main-panel"}
      flexGrow={1}
      flexDirection="column"
      border
      borderColor={props.focused ? TUI.borderActive : TUI.border}
      padding={1}
    >
      {props.title ? (
        <Text fg={TUI.text} height={1}>
          {props.title}
        </Text>
      ) : null}
      {props.summary ? (
        <Text fg={TUI.dim} height={1}>
          {props.summary}
        </Text>
      ) : null}
      {props.children}
    </Box>
  )
}

export function Footer(props: { text: string }) {
  return (
    <Box id="footer" height={2} marginTop={1} paddingLeft={1}>
      <Text id="controls" fg={TUI.dim}>
        {props.text}
      </Text>
    </Box>
  )
}

export function Sidebar<T extends string>(props: {
  items: SidebarItem<T>[]
  selected: T
  focused?: boolean
  hovered: T | null
  onSelect: (id: T) => void
  onHover: (id: T | null) => void
}) {
  return (
    <Box
      id="sidebar"
      width={20}
      border
      borderColor={props.focused ? TUI.borderActive : TUI.border}
      paddingTop={1}
      paddingLeft={1}
      paddingRight={1}
    >
      {props.items.map((item) => {
        const selected = item.id === props.selected
        const focusedSelected = selected && props.focused
        return (
          <Box
            key={item.id}
            height={2}
            paddingLeft={1}
            backgroundColor={focusedSelected ? "#1b2a35" : selected ? TUI.selected : item.id === props.hovered ? TUI.hover : TUI.bg}
            onMouseOver={(event) => {
              event.stopPropagation()
              props.onHover(item.id)
            }}
            onMouseOut={(event) => {
              event.stopPropagation()
              props.onHover(null)
            }}
            onMouseDown={(event) => {
              event.stopPropagation()
              props.onSelect(item.id)
            }}
          >
            <Text fg={selected ? TUI.green : item.id === props.hovered ? TUI.text : "#b8c7d8"} height={1}>
              {`${focusedSelected ? ">" : " "} ${item.label}${item.badge === undefined ? "" : ` ${item.badge}`}`}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}

export function StatusBadge(props: { status: StatusKind; selected?: boolean }) {
  return (
    <Text fg={props.selected ? TUI.green : statusColor(props.status)} height={1}>
      {`[${props.status}]`}
    </Text>
  )
}

export function ActionListItem(props: {
  id: string
  status: string
  title: string
  description: string
  actionHint: string
  category: string
  selected: boolean
  focused?: boolean
  hovered?: boolean
  onSelect: () => void
  onHover: (hovered: boolean) => void
}) {
  return (
    <Box
      key={props.id}
      height={5}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={props.selected && props.focused ? TUI.selected : props.selected ? TUI.selectedMuted : props.hovered ? TUI.hover : TUI.bg}
      border
      borderColor={props.selected && props.focused ? TUI.borderActive : props.hovered ? "#3b5870" : TUI.bg}
      onMouseOver={(event) => {
        event.stopPropagation()
        props.onHover(true)
      }}
      onMouseOut={(event) => {
        event.stopPropagation()
        props.onHover(false)
      }}
      onMouseDown={(event) => {
        event.stopPropagation()
        props.onSelect()
      }}
    >
      <Text fg={props.selected && props.focused ? TUI.green : statusColor(props.status)} height={1}>
        {`${props.selected && props.focused ? ">" : " "} [${props.status}] ${props.title}`}
      </Text>
      <Text fg={TUI.muted} height={1}>
        {props.description}
      </Text>
      <Text fg={TUI.dim} height={1}>
        {`${props.category} - ${props.actionHint}`}
      </Text>
    </Box>
  )
}

export function DetailsPanel(props: { title: string; sections: DetailsSection[]; width?: number }) {
  const width = props.width ?? 36
  return (
    <Box id="details" width={width} border borderColor={TUI.border} padding={1} flexDirection="column">
      <Text fg={TUI.text} height={1}>
        {props.title}
      </Text>
      {props.sections.map((section) => (
        <Box key={section.title} flexDirection="column" marginTop={1}>
          <Text fg={TUI.blue} height={1}>
            {section.title}
          </Text>
          {section.rows.map(([key, value]) => (
            <DetailRow key={`${section.title}:${key}`} label={key} value={value} width={width - 4} />
          ))}
        </Box>
      ))}
    </Box>
  )
}

export function EmptyState(props: {
  title: string
  explanation: string
  checkedPath?: string
  actions?: EmptyStateAction[]
}) {
  return (
    <Box flexDirection="column" border borderColor={TUI.border} paddingLeft={1} paddingRight={1}>
      <Text fg={TUI.blue} height={1}>
        {props.title}
      </Text>
      <Text fg={TUI.muted} wrapMode="word">
        {props.explanation}
      </Text>
      {props.checkedPath ? (
        <Box marginTop={1} flexDirection="column">
          <Text fg={TUI.dim} height={1}>
            Checked:
          </Text>
          <Text fg={TUI.text} wrapMode="word">
            {props.checkedPath}
          </Text>
        </Box>
      ) : null}
      {props.actions && props.actions.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          <Text fg={TUI.dim} height={1}>
            Actions:
          </Text>
          {props.actions.map((action) => (
            <Text key={`${action.key}:${action.label}`} fg={TUI.muted} height={1}>
              {`${action.key} ${action.label}`}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  )
}

export function ConfirmModal(props: {
  title: string
  body: string
  warning: string
  targetPath: string
  backupStatus: string
  plannedChangesCount: number
  requireText?: string
  input?: string
}) {
  return (
    <Box
      id="confirmation-modal"
      position="absolute"
      top="25%"
      left="25%"
      width="50%"
      border
      borderColor={TUI.yellow}
      padding={1}
      backgroundColor={TUI.panel}
      flexDirection="column"
    >
      <Text fg={TUI.yellow} height={1}>
        {props.title}
      </Text>
      <Text fg={TUI.text} wrapMode="word">
        {props.body}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text fg={TUI.muted} height={1}>
          {`Target database: ${shortenPath(props.targetPath, 58)}`}
        </Text>
        <Text fg={TUI.muted} height={1}>
          {`Backup status: ${props.backupStatus}`}
        </Text>
        <Text fg={TUI.muted} height={1}>
          {`Planned changes: ${props.plannedChangesCount}`}
        </Text>
        <Text fg={TUI.red} wrapMode="word">
          {props.warning}
        </Text>
      </Box>
      {props.requireText ? (
        <Box marginTop={1} flexDirection="column">
          <Text fg={TUI.text} height={1}>
            {`Type ${props.requireText} to continue`}
          </Text>
          <Text fg={props.input === props.requireText ? TUI.green : TUI.muted} height={1}>
            {`> ${props.input ?? ""}`}
          </Text>
        </Box>
      ) : null}
      <Text fg={TUI.dim} height={1}>
        {props.requireText ? "Enter confirm when typed - Esc cancel" : "Enter confirm - Esc cancel"}
      </Text>
    </Box>
  )
}

function DetailRow(props: { label: string; value: string | number | undefined; width: number }) {
  const value = displayValue(props.value, Math.max(12, props.width - props.label.length - 2))
  return (
    <Box flexDirection="column">
      <Text fg={TUI.muted} height={1}>
        {`${props.label}: ${value.first}`}
      </Text>
      {value.rest.map((line) => (
        <Text key={`${props.label}:${line.key}`} fg={TUI.dim} height={1}>
          {`  ${line.text}`}
        </Text>
      ))}
    </Box>
  )
}

function displayValue(value: string | number | undefined, width: number) {
  const input = String(value ?? "-")
  const shortened = looksLikePath(input) ? shortenPath(input, width) : input
  const lines = wrapValue(shortened, width)
  return { first: lines[0] ?? "-", rest: keyedLines(lines.slice(1)) }
}

function keyedLines(lines: string[]) {
  const seen = new Map<string, number>()
  return lines.map((text) => {
    const count = seen.get(text) ?? 0
    seen.set(text, count + 1)
    return { key: count === 0 ? text : `${text}:${count}`, text }
  })
}

function wrapValue(value: string, width: number) {
  if (value.length <= width) return [value]
  const words = value.split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    if (`${current} ${word}`.length > width) {
      lines.push(current)
      current = word
      continue
    }
    current = `${current} ${word}`
  }
  if (current) lines.push(current)
  return lines.flatMap((line) => hardWrap(line, width))
}

function hardWrap(value: string, width: number) {
  if (value.length <= width) return [value]
  const lines: string[] = []
  for (let index = 0; index < value.length; index += width) lines.push(value.slice(index, index + width))
  return lines
}

function looksLikePath(value: string) {
  return value.startsWith("/") || value.startsWith("~")
}
