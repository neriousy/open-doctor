import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

export const toolkitQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
})

export function ToolkitQueryProvider(props: { children: ReactNode }) {
  return <QueryClientProvider client={toolkitQueryClient}>{props.children}</QueryClientProvider>
}
