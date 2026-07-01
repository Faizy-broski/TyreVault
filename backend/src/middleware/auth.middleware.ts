import { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { supabase } from '../services/supabase.service'
import { redis } from '../services/redis.service'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: 'super_admin' | 'fitter' | 'customer'
  }
}

// Verify JWTs using Supabase's public JWKS endpoint.
// jose fetches the key set once and caches it locally — subsequent verifications
// are pure local crypto (~1ms). Works with both the current ECC (P-256 / ES256)
// key and any future key rotations automatically.
const JWKS = process.env.SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null
console.log('[auth] JWKS:', JWKS ? `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json` : 'NULL — falling back to network call')

async function verifyJWT(token: string): Promise<{ sub: string; email?: string } | null> {
  if (!JWKS) return null
  try {
    const { payload } = await jwtVerify(token, JWKS)
    return payload as { sub: string; email?: string }
  } catch {
    return null
  }
}

// In-memory fallback cache for role lookups (used when Redis is not configured).
// PM2 cluster caveat: each fork has its own Map — keep TTL short (60s) so a
// demoted user's stale role expires quickly across all forks.
const localRoleCache = new Map<string, { role: string; exp: number }>()

async function getRoleForUser(userId: string): Promise<string> {
  const cacheKey = `profile:role:${userId}`

  // 1. Try Redis (shared across all PM2 forks, 300s TTL)
  if (redis) {
    const cached = await redis.get<string>(cacheKey)
    if (cached) return cached
  } else {
    // 2. Fall back to process-local Map (60s TTL)
    const entry = localRoleCache.get(userId)
    if (entry && entry.exp > Date.now()) return entry.role
  }

  // 3. Fetch from DB and populate whichever cache is available
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const role = profile?.role ?? 'customer'

  if (redis) {
    await redis.set(cacheKey, role, { ex: 300 })
  } else {
    localRoleCache.set(userId, { role, exp: Date.now() + 60_000 })
  }

  return role
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }

  const token = authHeader.split(' ')[1]

  let userId: string
  let email: string

  // Fast path: local JWT verification (~1ms, no network call).
  // Falls back to supabase.auth.getUser() if SUPABASE_JWT_SECRET is not set.
  const payload = await verifyJWT(token)
  if (payload) {
    userId = payload.sub
    email  = payload.email ?? ''
  } else {
    console.warn('[auth] JWKS miss — falling back to supabase.auth.getUser() network call')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
    userId = user.id
    email  = user.email ?? ''
  }

  const role = await getRoleForUser(userId)

  req.user = {
    id:    userId,
    email,
    role:  role as 'super_admin' | 'fitter' | 'customer',
  }

  next()
}

/**
 * Call this whenever a user's role is updated in the profiles table to prevent
 * stale admin access during the cache TTL window.
 */
export async function invalidateRoleCache(userId: string): Promise<void> {
  const cacheKey = `profile:role:${userId}`
  if (redis) {
    await redis.del(cacheKey)
  } else {
    localRoleCache.delete(userId)
  }
}
