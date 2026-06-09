// Utility registry used by sectioned CLI/TUI help and future utility grouping.
import { listArchivedSessions, unarchiveSession } from "./sessions.js"

export const UTILS = [
  {
    id: "sessions-archived",
    section: "Utils",
    label: "Sessions: list archived",
    command: "utils sessions archived",
    run: listArchivedSessions,
  },
  {
    id: "sessions-unarchive",
    section: "Utils",
    label: "Sessions: unarchive",
    command: "utils sessions unarchive <session-id>",
    run: unarchiveSession,
  },
  {
    id: "db-path",
    section: "Utils",
    label: "DB path",
    command: "utils db path",
  },
]
