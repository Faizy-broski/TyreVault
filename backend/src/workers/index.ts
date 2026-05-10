import 'dotenv/config'
import { catalogueSyncWorker }  from './catalogue-sync.worker'
import { supplierImportWorker }  from './supplier-import.worker'
import { fulfillmentWorker }     from './fulfillment.worker'
import { stockSyncWorker }       from './stock-sync.worker'
import { notificationWorker }    from './notification.worker'
import { ensureSkuCollection }   from '../services/typesense.service'

async function start() {
  // Ensure Typesense SKU collection exists before workers start processing
  await ensureSkuCollection()

  console.log('[Workers] All BullMQ workers started:')
  console.log('  • catalogue-sync  (concurrency: 10)')
  console.log('  • supplier-import (concurrency: 1)')
  console.log('  • fulfillment     (concurrency: 5)')
  console.log('  • stock-sync      (concurrency: 3)')
  console.log('  • notification    (concurrency: 20)')
}

// Graceful shutdown
async function shutdown() {
  console.log('[Workers] Shutting down...')
  await Promise.all([
    catalogueSyncWorker.close(),
    supplierImportWorker.close(),
    fulfillmentWorker.close(),
    stockSyncWorker.close(),
    notificationWorker.close(),
  ])
  console.log('[Workers] All workers closed.')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

start().catch(err => {
  console.error('[Workers] Failed to start:', err)
  process.exit(1)
})
