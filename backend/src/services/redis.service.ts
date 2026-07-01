import IORedis from 'ioredis'

const host     = process.env.REDIS_HOST ?? '127.0.0.1'
const port     = Number(process.env.REDIS_PORT ?? 6379)
const password = process.env.REDIS_PASSWORD || undefined
const redisReady = process.env.REDIS_DISABLED !== 'true'

if (!redisReady) {
  console.warn('[redis] REDIS_DISABLED=true — cache disabled')
}

// Thin wrapper matching the previous @upstash/redis call-site shape
// (get<T>/set(key, value, {ex})/del(...keys)) so callers didn't need to change.
class RedisClient {
  private client: IORedis

  constructor() {
    this.client = new IORedis({
      host,
      port,
      password,
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    })
    this.client.on('error', (err) => console.warn('[redis] connection error:', err.message))
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key)
      if (raw == null) return null
      return JSON.parse(raw) as T
    } catch (err) {
      console.warn('[redis] get failed:', err instanceof Error ? err.message : err)
      return null
    }
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    try {
      const json = JSON.stringify(value)
      if (opts?.ex) {
        await this.client.set(key, json, 'EX', opts.ex)
      } else {
        await this.client.set(key, json)
      }
    } catch (err) {
      console.warn('[redis] set failed:', err instanceof Error ? err.message : err)
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return
    try {
      await this.client.del(...keys)
    } catch (err) {
      console.warn('[redis] del failed:', err instanceof Error ? err.message : err)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern)
    } catch (err) {
      console.warn('[redis] keys failed:', err instanceof Error ? err.message : err)
      return []
    }
  }
}

// null when unconfigured; callers must guard with `if (redis)`
export const redis: RedisClient | null = redisReady ? new RedisClient() : null

// TTL constants (seconds)
export const TTL = {
  STOCK: 60,           // 60 seconds — stock changes frequently
  PRICE: 3600,         // 60 minutes — invalidated on promotion/price change
  FACETS: 300,         // 5 minutes
  SKU_DETAIL: 600,     // 10 minutes
  FITMENT: 86400,      // 24 hours — vehicle fitment is near-static
  ADMIN_KPI: 300,      // 5 minutes
  SUPPLIER_MAP: 3600,  // 1 hour
  WHEEL_BRANDS: 3600,  // 1 hour — near-static reference data
  GEOCODE: 2592000,    // 30 days — postcode → lat/lng never changes
  DIST_MATRIX: 86400,  // 24 hours — driving distances per postcode
} as const
