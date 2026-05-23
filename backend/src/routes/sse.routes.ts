import { Router, type Request, type Response } from 'express'
import { supabase as db } from '../services/supabase.service'

const router = Router()

// GET /api/sse/stock/:productId
// Server-Sent Events endpoint for live stock updates.
// Pushes { available_stock } on change via Supabase Realtime.
router.get('/stock/:productId', (req: Request, res: Response) => {
  const { productId } = req.params

  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  function send(data: object) {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // Send current stock immediately on connect
  void (async () => {
    try {
      const { data } = await db.from('skus').select('total_available_stock').eq('product_id', productId).maybeSingle()
      if (data) send({ available_stock: data.total_available_stock ?? 0 })
    } catch { /* ignore */ }
  })()

  // Subscribe to realtime changes on skus row
  const channel = db
    .channel(`stock:${productId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'skus',
        filter: `product_id=eq.${productId}`,
      },
      (payload) => {
        const stock = (payload.new as any)?.total_available_stock ?? 0
        send({ available_stock: stock })
      }
    )
    .subscribe()

  // Keepalive every 25s to prevent proxy timeout
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 25_000)

  req.on('close', () => {
    clearInterval(keepalive)
    db.removeChannel(channel)
    res.end()
  })
})

export default router
