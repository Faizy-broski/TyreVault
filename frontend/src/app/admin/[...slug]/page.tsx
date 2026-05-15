import { notFound } from 'next/navigation'

// Catch-all: any /admin/* URL that doesn't match an existing page triggers the admin not-found.tsx
export default function AdminCatchAll() {
  notFound()
}
