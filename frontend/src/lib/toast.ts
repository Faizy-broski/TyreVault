import { toast } from 'sonner'

const SHORT  = 3000
const MEDIUM = 4000
const LONG   = 6000

export function toastSuccess(message: string, description?: string) {
  return toast.success(message, { description, duration: SHORT })
}

export function toastError(message: string, description?: string) {
  return toast.error(message, { description, duration: LONG })
}

export function toastWarning(message: string, description?: string) {
  return toast.warning(message, { description, duration: MEDIUM })
}

export function toastInfo(message: string, description?: string) {
  return toast.info(message, { description, duration: MEDIUM })
}

export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error:   string | ((err: unknown) => string)
  }
) {
  return toast.promise(promise, messages)
}

export function parseApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string' && err.trim()) return err
  return fallback
}
