import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatError } from "@open-doctor/core/error"
import { resolveDbArg } from "@open-doctor/core/input"
import type { ToolkitHealth } from "../health.js"
import { emptyHealth } from "../health.js"
import { healthQueryOptions } from "../query/toolkit.js"
import { overviewStatus } from "../util/status.js"
import { useToastContext } from "../ui/toast.js"
import { createStateContext } from "./helper.js"
import { useRoute } from "./route.js"

export type HealthContext = {
  snapshot: ToolkitHealth
  status: {
    message: string
    set: (status: string) => void
  }
  loading: boolean
  refreshing: boolean
  stale: boolean
  error: string | undefined
  actions: {
    refresh: () => void
  }
}

const context = createStateContext<HealthContext>({
  name: "Health",
  init: () => {
    const dbPath = resolveDbArg()
    const query = useQuery(healthQueryOptions(dbPath))
    const snapshot = query.data ?? emptyHealth(dbPath)
    const [message, setMessage] = useState("Checking OpenCode data...")
    const toast = useToastContext()
    const route = useRoute()

    function refresh() {
      setMessage("Refreshing OpenCode data...")
      query.refetch().catch(() => undefined)
    }

    useEffect(() => {
      if (!query.data) return
      if (route.location.view === "overview") setMessage(overviewStatus(query.data))
    }, [query.dataUpdatedAt, route.location.view])

    useEffect(() => {
      if (!query.error) return
      const next = formatError(query.error)
      setMessage(next)
      toast.actions.show({ variant: "error", message: next })
    }, [query.errorUpdatedAt])

    useEffect(() => {
      if (query.isLoading) return
      if (route.location.view === "overview") setMessage(overviewStatus(snapshot))
    }, [query.isLoading, route.location.view])

    return {
      snapshot,
      status: {
        message,
        set: setMessage,
      },
      loading: query.isLoading,
      refreshing: query.isFetching && !query.isLoading,
      stale: query.isStale,
      error: query.error ? formatError(query.error) : undefined,
      actions: {
        refresh,
      },
    }
  },
})

export const HealthProvider = context.Provider
export const useHealth = context.useValue
