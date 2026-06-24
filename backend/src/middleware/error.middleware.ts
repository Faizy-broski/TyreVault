import { Request, Response, NextFunction } from 'express'

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err?.message ?? String(err)
  const stack   = err?.stack   ?? message
  console.error('[error]', stack)
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
  })
}
