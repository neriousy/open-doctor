// Structured key/value details panel for narrow right-hand TUI columns.
export type DetailsSection = {
  title: string
  rows: Array<[string, string | number | undefined]>
}

export function DetailsPanel(props: { title: string; sections: DetailsSection[]; width?: number }) {
  const width = props.width ?? 36
  return (
    <box id="details" width={width} border borderColor="#263544" padding={1} flexDirection="column">
      <text fg="#d6deeb" height={1}>
        {props.title}
      </text>
      {props.sections.map((section) => (
        <box key={section.title} flexDirection="column" marginTop={1}>
          <text fg="#82aaff" height={1}>
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

function DetailRow(props: { label: string; value: string | number | undefined; width: number }) {
  const value = displayValue(props.value, Math.max(12, props.width - props.label.length - 2))
  return (
    <box flexDirection="column">
      <text fg="#9fb3c8" height={1}>
        {`${props.label}: ${value.first}`}
      </text>
      {value.rest.map((line, index) => (
        <text key={`${props.label}:${index}`} fg="#7893ad" height={1}>
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

export function shortenPath(value: string, width = 28) {
  if (value.length <= width) return value
  const parts = value.split("/").filter(Boolean)
  if (parts.length <= 3) return middleEllipsis(value, width)

  const prefix = value.startsWith("/") ? `/${parts[0]}` : parts[0] ?? ""
  const tailCount = Math.min(2, parts.length - 1)
  const tail = parts.slice(-tailCount).join("/")
  const candidate = `${prefix}/.../${tail}`
  if (candidate.length <= width) return candidate

  const shorterTail = parts.at(-1)
  if (shorterTail) {
    const next = `${prefix}/.../${shorterTail}`
    if (next.length <= width) return next
  }

  return middleEllipsis(value, width)
}

function middleEllipsis(value: string, width: number) {
  if (width <= 5) return value.slice(0, width)
  const left = Math.ceil((width - 3) / 2)
  const right = Math.floor((width - 3) / 2)
  return `${value.slice(0, left)}...${value.slice(value.length - right)}`
}
