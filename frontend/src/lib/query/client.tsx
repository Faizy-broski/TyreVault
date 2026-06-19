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
        staleTime:            5 * 60_000,  // 5 min — data stays fresh across page navigations
        gcTime:               10 * 60_000, // keep unused cache for 10 min
        retry:                1,
        refetchOnWindowFocus: false,       // tab switching shouldn't trigger refetch in admin
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

