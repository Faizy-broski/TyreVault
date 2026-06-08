import { Queue } from 'bullmq'
import type { CatalogImportJobData } from '../workers/catalog-import.worker'

const redisUrl = process.env.UPSTASH_REDIS_URL ?? ''
const redisReady =
  (redisUrl.startsWith('rediss://') || redisUrl.startsWith('redis://')) &&
  !redisUrl.includes('YOUR_')

let catalogImportQueue: Queue | null = null

if (redisReady) {
  catalogImportQueue = new Queue('catalog-import', {
    connection: { url: redisUrl, maxRetriesPerRequest: null as null, enableReadyCheck: false },
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
      removeOnComplete: { count: 20 },
      removeOnFail:     { count: 100 },
    },
  })
}

export async function enqueueCatalogImport(
  mode:      CatalogImportJobData['mode'],
  rows:      Record<string, string>[],
  columnMap: Record<string, string>,
  sessionId: string,
): Promise<string> {
  if (!catalogImportQueue) {
    throw new Error('BullMQ not configured — set UPSTASH_REDIS_URL')
  }

  const jobData: CatalogImportJobData = { mode, rows, columnMap, session_id: sessionId }
  const job = await catalogImportQueue.add('import', jobData, {
    jobId: `catalog-import:${mode}:${sessionId}`,
  })

  return job.id!
}

export async function getCatalogImportJob(jobId: string) {
  if (!catalogImportQueue) {
    return { state: 'unknown', progress: 0 }
  }

  const job = await catalogImportQueue.getJob(jobId)
  if (!job) return { state: 'not_found', progress: 0 }

  const state    = await job.getState()
  const progress = typeof job.progress === 'number' ? job.progress : 0

  return {
    state,
    progress,
    result:     state === 'completed' ? job.returnvalue  : null,
    failReason: state === 'failed'    ? job.failedReason : null,
  }
}
