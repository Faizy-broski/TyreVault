import { Queue } from 'bullmq'

const redisUrl = process.env.UPSTASH_REDIS_URL ?? ''
const redisReady = (redisUrl.startsWith('rediss://') || redisUrl.startsWith('redis://'))
  && !redisUrl.includes('YOUR_')

if (!redisReady) {
  console.warn('[queues] UPSTASH_REDIS_URL not configured — BullMQ queues disabled')
}

function makeQueue(name: string, opts: object): Queue | null {
  if (!redisReady) return null
  const connection = {
    url: redisUrl,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  }
  return new Queue(name, { connection, ...opts })
}

export const catalogueSyncQueue = makeQueue('catalogue-sync', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})

export const supplierImportQueue = makeQueue('supplier-import', {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 100 },
  },
})

export const fulfillmentQueue = makeQueue('fulfillment', {
  defaultJobOptions: {
    attempts: 1,
    priority: 1,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
})

export const stockSyncQueue = makeQueue('stock-sync', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
  },
})

export const notificationQueue = makeQueue('notification', {
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: true,
    removeOnFail: { count: 200 },
  },
})
