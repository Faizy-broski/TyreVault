import { Worker, type Job } from 'bullmq'
import { supabase } from '../services/supabase.service'

const connection = {
  url: process.env.UPSTASH_REDIS_URL!,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
}

export type NotificationJobData =
  | { type: 'order_confirmed';     customer_email: string; order_number: string; total_amount: number }
  | { type: 'fitment_job_assigned'; fitter_email: string; job_id: string; scheduled_date: string }
  | { type: 'fitment_job_completed'; customer_email: string; order_number: string }
  | { type: 'stock_low_alert';     admin_email: string; product_id: string; sku: string; stock: number }
  | { type: 'supplier_import_done'; admin_email: string; supplier_id: string; results: Record<string, number> }

// ============================================================
// Worker — concurrency: 20, fire-and-forget
// Sends transactional notifications.
// Phase 1: Supabase Auth emails only (built-in).
// Phase 2: Replace with SendGrid / Postmark.
// ============================================================
export const notificationWorker = new Worker<NotificationJobData>(
  'notification',
  async (job: Job<NotificationJobData>) => {
    const { data } = job

    switch (data.type) {
      case 'order_confirmed':
        await sendOrderConfirmation(data)
        break

      case 'fitment_job_assigned':
        await sendFitmentJobAssigned(data)
        break

      case 'fitment_job_completed':
        await sendFitmentJobCompleted(data)
        break

      case 'stock_low_alert':
        console.log(`[Notification] Low stock alert: SKU ${data.sku} = ${data.stock} units`)
        // TODO Stage 6: send to admin Slack / email
        break

      case 'supplier_import_done':
        console.log(`[Notification] Supplier import done for ${data.supplier_id}:`, data.results)
        // TODO Stage 6: send summary to admin
        break
    }
  },
  { connection, concurrency: 20 }
)

notificationWorker.on('failed', (job, err) => {
  console.error(`[Notification] Job ${job?.id} failed:`, err.message)
})

// ============================================================
// Notification handlers (Phase 1: log only; Phase 2: email API)
// ============================================================

async function sendOrderConfirmation(data: Extract<NotificationJobData, { type: 'order_confirmed' }>) {
  // Phase 1: Supabase auth emails handle auth flows only.
  // Transactional emails (order confirmed) need an email service.
  // TODO Stage 6: integrate SendGrid / Postmark
  console.log(`[Notification] Order confirmed → ${data.customer_email} | Order #${data.order_number} | $${data.total_amount}`)
}

async function sendFitmentJobAssigned(data: Extract<NotificationJobData, { type: 'fitment_job_assigned' }>) {
  console.log(`[Notification] Job assigned → ${data.fitter_email} | Job ${data.job_id} on ${data.scheduled_date}`)
  // TODO Stage 6: email + Supabase Realtime push
}

async function sendFitmentJobCompleted(data: Extract<NotificationJobData, { type: 'fitment_job_completed' }>) {
  console.log(`[Notification] Job completed → ${data.customer_email} | Order #${data.order_number}`)
  // TODO Stage 6: email customer with completion confirmation
}
