'use client'

import { useState } from 'react'
import { QueryClient, QueryCache, QueryClientProvider } from '@tanstack/react-query'
import { toastError } from '@/lib/toast'

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) =>
        toastError(error instanceof Error ? error.message : 'An unexpected error occurred'),
    }),
    defaultOptions: {
      queries: {
        staleTime:            30_000,      // data is fresh for 30 s
        gcTime:               5 * 60_000,  // keep unused data in memory for 5 min
        retry:                1,
        refetchOnWindowFocus: true,
        refetchOnReconnect:   true,
      },
    },
  })
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // useState so the client is stable across renders but re-created per-user-session
  const [client] = useState(makeQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
