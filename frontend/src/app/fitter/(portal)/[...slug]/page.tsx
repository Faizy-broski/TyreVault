import { notFound } from 'next/navigation'

// Catch-all: any /fitter/* URL that doesn't match an existing portal page triggers the fitter not-found.tsx
export default function FitterCatchAll() {
  notFound()
}
