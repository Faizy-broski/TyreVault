import { Redis } from '@upstash/redis'

const restUrl   = process.env.UPSTASH_REDIS_REST_URL  ?? ''
const restToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''
const redisReady = restUrl.startsWith('https://') && !restUrl.includes('YOUR_')

if (!redisReady) {
  console.warn('[redis] UPSTASH_REDIS_REST_URL not configured — cache disabled')
}

// null when unconfigured; callers must guard with `if (redis)`
export const redis: Redis | null = redisReady
  ? new Redis({ url: restUrl, token: restToken })
  : null

// TTL constants (seconds)
export const TTL = {
  STOCK: 60,          // 60 seconds — stock changes frequently
  PRICE: 3600,        // 60 minutes — invalidated on promotion/price change
  FACETS: 300,        // 5 minutes
  SKU_DETAIL: 600,    // 10 minutes
  FITMENT: 86400,     // 24 hours — vehicle fitment is near-static
  ADMIN_KPI: 300,     // 5 minutes
  SUPPLIER_MAP: 3600, // 1 hour
} as const
