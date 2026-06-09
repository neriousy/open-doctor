// Shared OpenTUI layout and display primitives.
import type { ReactNode } from "react"
import { shortenPath, statusColor, TUI } from "./primitives-model.js"
import type { DetailsSection, EmptyStateAction, SidebarItem, StatusKind } from "./primitives-model.js"

export function AppShell(props: {
  header: ReactNode
  sidebar?: ReactNode
  main: ReactNode
  details?: ReactNode
  footer: ReactNode
  overlays?: ReactNode
}) {
  return (
    <box id="root" flexDirection="column" width="100%" height="100%" padding={1} backgroundColor={TUI.bg}>
      {props.header}
      <box id="app-body" flexGrow={1} flexShrink={1} flexDirection="row" columnGap={1}>
        {props.sidebar}
        <box id="app-main" flexGrow={1} flexShrink={1} flexDirection="column">
          {props.main}
        </box>
        {props.details}
      </box>
      {props.footer}
      {props.overlays}
    </box>
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
    <box id="header" height={5} border borderColor={TUI.border} paddingLeft={2} paddingRight={2} paddingTop={1}>
      <text id="title" fg={TUI.text} height={1}>
        {props.title}
      </text>
      <text id="subtitle" fg={TUI.dim} height={1}>
        {`${shortenPath(props.dataPath, 72)} | Repairs: ${props.repairCount} | Archived: ${props.archivedCount} | Log errors: ${props.logErrorCount} | Backup: ${props.backupStatus}`}
      </text>
    </box>
  )
}

export function MainPanel(props: { id?: string; title?: string; summary?: string; focused?: boolean; children: ReactNode }) {
  return (
    <box
      id={props.id ?? "main-panel"}
      flexGrow={1}
      flexDirection="column"
      border
      borderColor={props.focused ? TUI.borderActive : TUI.border}
      padding={1}
    >
      {props.title ? (
        <text fg={TUI.text} height={1}>
          {props.title}
        </text>
      ) : null}
      {props.summary ? (
        <text fg={TUI.dim} height={1}>
          {props.summary}
        </text>
      ) : null}
      {props.children}
    </box>
  )
}

export function Footer(props: { text: string }) {
  return (
    <box id="footer" height={2} marginTop={1} paddingLeft={1}>
      <text id="controls" fg={TUI.dim}>
        {props.text}
      </text>
    </box>
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
    <box
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
          <box
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
            <text fg={selected ? TUI.green : item.id === props.hovered ? TUI.text : "#b8c7d8"} height={1}>
              {`${focusedSelected ? ">" : " "} ${item.label}${item.badge === undefined ? "" : ` ${item.badge}`}`}
            </text>
          </box>
        )
      })}
    </box>
  )
}

export function StatusBadge(props: { status: StatusKind; selected?: boolean }) {
  return (
    <text fg={props.selected ? TUI.green : statusColor(props.status)} height={1}>
      {`[${props.status}]`}
    </text>
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
    <box
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
      <text fg={props.selected && props.focused ? TUI.green : statusColor(props.status)} height={1}>
        {`${props.selected && props.focused ? ">" : " "} [${props.status}] ${props.title}`}
      </text>
      <text fg={TUI.muted} height={1}>
        {props.description}
      </text>
      <text fg={TUI.dim} height={1}>
        {`${props.category} - ${props.actionHint}`}
      </text>
    </box>
  )
}

export function DetailsPanel(props: { title: string; sections: DetailsSection[]; width?: number }) {
  const width = props.width ?? 36
  return (
    <box id="details" width={width} border borderColor={TUI.border} padding={1} flexDirection="column">
      <text fg={TUI.text} height={1}>
        {props.title}
      </text>
      {props.sections.map((section) => (
        <box key={section.title} flexDirection="column" marginTop={1}>
          <text fg={TUI.blue} height={1}>
            {section.title}
          </text>
          {section.rows.map(([key, value]) => (
            <DetailRow key={`${section.title}:${key}`} label={key} value={value} width={width - 4} />
          ))}
        </box>
      ))}
    </box>
  )
}

export function EmptyState(props: {
  title: string
  explanation: string
  checkedPath?: string
  actions?: EmptyStateAction[]
}) {
  return (
    <box flexDirection="column" border borderColor={TUI.border} paddingLeft={1} paddingRight={1}>
      <text fg={TUI.blue} height={1}>
        {props.title}
      </text>
      <text fg={TUI.muted} wrapMode="word">
        {props.explanation}
      </text>
      {props.checkedPath ? (
        <box marginTop={1} flexDirection="column">
          <text fg={TUI.dim} height={1}>
            Checked:
          </text>
          <text fg={TUI.text} wrapMode="word">
            {props.checkedPath}
          </text>
        </box>
      ) : null}
      {props.actions && props.actions.length > 0 ? (
        <box marginTop={1} flexDirection="column">
          <text fg={TUI.dim} height={1}>
            Actions:
          </text>
          {props.actions.map((action) => (
            <text key={`${action.key}:${action.label}`} fg={TUI.muted} height={1}>
              {`${action.key} ${action.label}`}
            </text>
          ))}
        </box>
      ) : null}
    </box>
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
    <box
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
      <text fg={TUI.yellow} height={1}>
        {props.title}
      </text>
      <text fg={TUI.text} wrapMode="word">
        {props.body}
      </text>
      <box marginTop={1} flexDirection="column">
        <text fg={TUI.muted} height={1}>
          {`Target database: ${shortenPath(props.targetPath, 58)}`}
        </text>
        <text fg={TUI.muted} height={1}>
          {`Backup status: ${props.backupStatus}`}
        </text>
        <text fg={TUI.muted} height={1}>
          {`Planned changes: ${props.plannedChangesCount}`}
        </text>
        <text fg={TUI.red} wrapMode="word">
          {props.warning}
        </text>
      </box>
      {props.requireText ? (
        <box marginTop={1} flexDirection="column">
          <text fg={TUI.text} height={1}>
            {`Type ${props.requireText} to continue`}
          </text>
          <text fg={props.input === props.requireText ? TUI.green : TUI.muted} height={1}>
            {`> ${props.input ?? ""}`}
          </text>
        </box>
      ) : null}
      <text fg={TUI.dim} height={1}>
        {props.requireText ? "Enter confirm when typed - Esc cancel" : "Enter confirm - Esc cancel"}
      </text>
    </box>
  )
}

function DetailRow(props: { label: string; value: string | number | undefined; width: number }) {
  const value = displayValue(props.value, Math.max(12, props.width - props.label.length - 2))
  return (
    <box flexDirection="column">
      <text fg={TUI.muted} height={1}>
        {`${props.label}: ${value.first}`}
      </text>
      {value.rest.map((line, index) => (
        <text key={`${props.label}:${index}`} fg={TUI.dim} height={1}>
          {`  ${line}`}
        </text>
      ))}
    </box>
  )
}

function displayValue(value: string | number | undefined, width: number) {
  const input = String(value ?? "-")
  const shortened = looksLikePath(input) ? shortenPath(input, width) : input
  const lines = wrapValue(shortened, width)
  return { first: lines[0] ?? "-", rest: lines.slice(1) }
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
