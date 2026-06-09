// Read-only OpenCode log discovery and raw tail reading for diagnostics.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { defaultDataDir, resolveDbArg } from "../cli/input.js"

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE" | "UNKNOWN"

export type LogSource = {
  id: string
  label: string
  path: string
  size: number
  mtime: number
  errorCount: number
  warningCount: number
}

export type LogEntry = {
  id: string
  sourceId: string
  sourceLabel: string
  file: string
  line: number
  originalLineNumber: number
  level: LogLevel
  severity: LogLevel
  inheritedSeverity: LogLevel
  entryId: string
  isHeader: boolean
  isContinuation: boolean
  text: string
  time: string
  timestamp: string
  service: string
  message: string
  parentMessage: string
  headerLine: number
  entryStartLine: number
  entryEndLine: number
  raw: string
}

export type LogSummary = {
  sourceCount: number
  warningCount: number
  errorCount: number
}

const LOG_EXTENSIONS = new Set([".log", ".txt"])
const MAX_LOG_BYTES = 256 * 1024

export function discoverLogSources(dbPath = resolveDbArg()) {
  const dataDir = fs.existsSync(dbPath) ? path.dirname(dbPath) : path.join(defaultDataDir(), "opencode")
  const candidates = [
    path.join(dataDir, "log"),
    path.join(dataDir, "logs"),
    path.join(os.homedir(), "Library", "Logs", "@opencode-ai"),
    path.join(os.homedir(), "Library", "Logs", "OpenCode"),
  ]

  const files = candidates.flatMap((candidate) => collectLogFiles(candidate, 3))
  const unique = new Map<string, LogSource>()
  for (const file of files) {
    const stat = fs.statSync(file)
    const counts = countLogLevels(file)
    unique.set(file, {
      id: file,
      label: sourceLabel(file, dataDir, stat.mtime),
      path: file,
      size: stat.size,
      mtime: stat.mtime.getTime(),
      errorCount: counts.errorCount,
      warningCount: counts.warningCount,
    })
  }

  return [...unique.values()].sort((left, right) => right.mtime - left.mtime)
}

export function readLogEntries(source: LogSource, options: { maxLines?: number } = {}) {
  const maxLines = options.maxLines ?? 300
  const raw = readTail(source.path, MAX_LOG_BYTES)
  const lines = raw.split(/\r?\n/)
  const startLine = Math.max(1, lines.length - maxLines + 1)
  const groups = groupLogLines(source, lines.slice(-maxLines), startLine)

  return groups.reverse().flat()
}

export function summarizeLogs(sources = discoverLogSources()): LogSummary {
  let warningCount = 0
  let errorCount = 0

  for (const source of sources.slice(0, 12)) {
    try {
      for (const entry of readLogEntries(source, { maxLines: 200 })) {
        if (entry.level === "WARN") warningCount += 1
        if (entry.level === "ERROR") errorCount += 1
      }
    } catch {
      continue
    }
  }

  return {
    sourceCount: sources.length,
    warningCount,
    errorCount,
  }
}

function collectLogFiles(input: string, depth: number): string[] {
  if (depth < 0 || !fs.existsSync(input)) return []
  const stat = safeStat(input)
  if (!stat) return []
  if (stat.isFile()) return isLogFile(input) ? [input] : []
  if (!stat.isDirectory()) return []

  try {
    return fs
      .readdirSync(input)
      .flatMap((name) => collectLogFiles(path.join(input, name), depth - 1))
      .sort()
  } catch {
    return []
  }
}

function isLogFile(file: string) {
  if (isNonLogStateFile(file)) return false
  const ext = path.extname(file).toLowerCase()
  if (LOG_EXTENSIONS.has(ext)) return true
  return false
}

function readTail(file: string, maxBytes: number) {
  const stat = fs.statSync(file)
  const length = Math.min(stat.size, maxBytes)
  const fd = fs.openSync(file, "r")
  try {
    const buffer = Buffer.alloc(length)
    fs.readSync(fd, buffer, 0, length, Math.max(0, stat.size - length))
    return buffer.toString("utf8")
  } finally {
    fs.closeSync(fd)
  }
}

function groupLogLines(source: LogSource, lines: string[], startLine: number) {
  const groups: LogEntry[][] = []
  let current: LogEntry[] = []
  let currentHeader: HeaderParts | undefined
  let currentEntryId = ""

  lines.forEach((raw, index) => {
    const line = startLine + index
    const parsed = parseHeader(raw)
    if (parsed) {
      if (current.length > 0) finalizeGroup(current)
      current = []
      currentHeader = { ...parsed, headerLine: parsed.headerLine > 0 ? parsed.headerLine : line }
      currentEntryId = `${source.id}:${line}`
      current.push(entry(source, line, raw, currentHeader, currentEntryId, false))
      groups.push(current)
      return
    }

    const fallback = currentHeader ?? {
      level: "UNKNOWN",
      timestamp: "",
      service: "",
      message: raw,
      text: raw,
      headerLine: line,
    }
    if (current.length === 0) {
      currentEntryId = `${source.id}:${line}`
      currentHeader = fallback
      groups.push(current)
    }
    current.push(entry(source, line, raw, fallback, currentEntryId, true))
  })

  if (current.length > 0) finalizeGroup(current)
  return groups
}

function finalizeGroup(group: LogEntry[]) {
  const start = group[0]?.line ?? 0
  const end = group[group.length - 1]?.line ?? start
  for (const row of group) {
    row.entryStartLine = start
    row.entryEndLine = end
  }
}

function entry(source: LogSource, line: number, raw: string, header: HeaderParts, entryId: string, continuation: boolean): LogEntry {
  const inheritedSeverity = normalizeLevel(header.level)
  const text = continuation ? raw : header.text
  const headerLine = header.headerLine > 0 ? header.headerLine : line
  return {
    id: `${source.id}:${line}`,
    sourceId: source.id,
    sourceLabel: source.label,
    file: source.path,
    line,
    originalLineNumber: line,
    level: inheritedSeverity,
    severity: continuation ? "UNKNOWN" : inheritedSeverity,
    inheritedSeverity,
    entryId,
    isHeader: !continuation,
    isContinuation: continuation,
    text,
    time: header.timestamp,
    timestamp: header.timestamp,
    service: header.service,
    message: continuation ? text : header.message,
    parentMessage: header.message,
    headerLine,
    entryStartLine: line,
    entryEndLine: line,
    raw,
  }
}

type HeaderParts = {
  level: string
  timestamp: string
  service: string
  message: string
  text: string
  headerLine: number
}

function parseHeader(raw: string): HeaderParts | undefined {
  const numbered = raw.match(/^\s*(?:(\d+)\s+)?(ERROR|ERR|FATAL|WARN|WARNING|INFO|DEBUG|TRACE)\s+(\d{4}-\d{2}-\d{2}T[^\s]+)(?:\s+\+\S+)?\s+(.*)$/i)
  if (numbered) {
    const line = numbered[1]
    const level = numbered[2] ?? "UNKNOWN"
    const timestamp = numbered[3] ?? ""
    const message = numbered[4] ?? ""
    return {
      level,
      timestamp,
      service: parseService(message),
      message,
      text: message,
      headerLine: line ? Number(line) : 0,
    }
  }

  const cli = raw.match(/^(ERROR|ERR|FATAL|WARN|WARNING|INFO|DEBUG|TRACE)\s+(\d{4}-\d{2}-\d{2}T\S+)\s+\+\S+\s*(.*)$/i)
  if (cli) {
    const level = cli[1] ?? "UNKNOWN"
    const timestamp = cli[2] ?? ""
    const message = cli[3] ?? ""
    return {
      level,
      timestamp,
      service: parseService(message),
      message,
      text: message,
      headerLine: 0,
    }
  }

  const desktop = raw.match(/^\[(.+?)\]\s+\[([a-zA-Z]+)\]\s+(.*)$/)
  if (desktop) {
    const timestamp = desktop[1] ?? ""
    const level = desktop[2] ?? "UNKNOWN"
    const message = desktop[3] ?? ""
    return {
      level,
      timestamp,
      service: parseService(message),
      message,
      text: message,
      headerLine: 0,
    }
  }

  return undefined
}

function parseService(message: string) {
  const match = message.match(/\b(?:service|source)=([^\s]+)/)
  return match?.[1] ?? ""
}

function countLogLevels(file: string) {
  let errorCount = 0
  let warningCount = 0
  try {
    for (const raw of readTail(file, MAX_LOG_BYTES).split(/\r?\n/)) {
      const header = parseHeader(raw)
      if (!header) continue
      const level = normalizeLevel(header.level)
      if (level === "ERROR") errorCount += 1
      if (level === "WARN") warningCount += 1
    }
  } catch {
    return { errorCount: 0, warningCount: 0 }
  }

  return { errorCount, warningCount }
}

function normalizeLevel(level: string | undefined): LogLevel {
  const next = (level ?? "").toUpperCase()
  if (next === "ERROR" || next === "ERR" || next === "FATAL") return "ERROR"
  if (next === "WARN" || next === "WARNING") return "WARN"
  if (next === "INFO") return "INFO"
  if (next === "DEBUG") return "DEBUG"
  if (next === "TRACE") return "TRACE"
  return "UNKNOWN"
}

function sourceLabel(file: string, dataDir: string, modifiedAt: Date) {
  return `${sourceKind(file, dataDir)} ${formatSourceDate(file, modifiedAt)}`
}

function sourceKind(file: string, dataDir: string) {
  if (file.startsWith(dataDir)) return "CLI"
  if (file.includes(`${path.sep}Library${path.sep}Logs`)) return "Desktop"
  return "Log"
}

function formatSourceDate(file: string, fallback: Date) {
  const parsed = dateFromFilename(file)
  return formatDateTime(parsed ?? fallback)
}

function dateFromFilename(file: string) {
  const match = path.basename(file).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})/)
  if (!match) return undefined

  const [, year, month, day, hour, minute, second] = match
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )

  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDateTime(date: Date) {
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()] ?? "???"
  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function isNonLogStateFile(file: string) {
  const name = path.basename(file).toLowerCase()
  return name === "prompt-history.jsonl" || name === "frecency.jsonl"
}

function safeStat(file: string) {
  try {
    return fs.statSync(file)
  } catch {
    return undefined
  }
}
