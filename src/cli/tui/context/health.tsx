import { useEffect, useState } from "react"
import { formatError } from "../../../error.js"
import type { ToolkitHealth } from "../health.js"
import { emptyHealth, scanToolkitHealth } from "../health.js"
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
  actions: {
    refresh: () => void
  }
}

const context = createStateContext<HealthContext>({
  name: "Health",
  init: () => {
    const [snapshot, setSnapshot] = useState(() => emptyHealth())
    const [message, setMessage] = useState("Checking OpenCode data...")
    const [loading, setLoading] = useState(true)
    const toast = useToastContext()
    const route = useRoute()

    function refresh() {
      setLoading(true)
      scanToolkitHealth()
        .then((next) => {
          setSnapshot(next)
          if (route.location.view === "overview") setMessage(overviewStatus(next))
        })
        .catch((error: unknown) => {
          const next = formatError(error)
          setMessage(next)
          toast.actions.show({ variant: "error", message: next })
        })
        .finally(() => setLoading(false))
    }

    useEffect(() => {
      refresh()
    }, [])

    useEffect(() => {
      if (loading) return
      if (route.location.view === "overview") setMessage(overviewStatus(snapshot))
    }, [loading, route.location.view])

    return {
      snapshot,
      status: {
        message,
        set: setMessage,
      },
      loading,
      actions: {
        refresh,
      },
    }
  },
})

export const HealthProvider = context.Provider
export const useHealth = context.useValue
