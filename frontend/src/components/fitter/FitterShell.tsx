'use client'

import { ReactQueryProvider } from '@/lib/query/client'

export default function FitterShell({ children }: { children: React.ReactNode }) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>
}

