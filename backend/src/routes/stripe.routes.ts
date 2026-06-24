import { Router } from 'express'
import Stripe from 'stripe'
import { supabase as db } from '../services/supabase.service'
import { redis, TTL } from '../services/redis.service'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const GMAPS_KEY = process.env.GOOGLE_MAPS_KEY ?? ''
if (!GMAPS_KEY) console.warn('[stripe.routes] GOOGLE_MAPS_KEY not set — geocoding and distance matrix disabled')

// ── Google Maps helpers ────────────────────────────────────────────────────

interface LatLng { lat: number; lng: number }

/** Geocode a postcode to lat/lng — Redis-cached for 30 days. */
async function geocodePostcode(postcode: string): Promise<LatLng | null> {
  const cacheKey = `geocode:${postcode}`
  if (redis) {
    const cached = await redis.get<LatLng>(cacheKey).catch(() => null)
    if (cached) return cached
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postcode + ',Australia')}&key=${GMAPS_KEY}`
    const res  = await fetch(url)
    const json = await res.json() as { status: string; results: { geometry: { location: LatLng } }[] }
    if (json.status !== 'OK' || !json.results.length) return null
    const loc = json.results[0].geometry.location
    if (redis) await redis.set(cacheKey, loc, { ex: TTL.GEOCODE }).catch(() => {})
    return loc
  } catch { return null }
}

interface DistEntry { distanceM: number; durationS: number }
type DistMatrix = Record<string, DistEntry>   // key = "centreId"

const DIST_MATRIX_CHUNK = 25   // Google standard plan: max 25 destinations per request

/** Batch Distance Matrix call — chunked to 25 destinations, Redis-cached 24 h per postcode. */
async function getDistanceMatrix(
  postcode: string,
  origin: LatLng,
  centres: { fitment_centre_id: string; latitude: number | null; longitude: number | null }[],
): Promise<DistMatrix> {
  const cacheKey = `distmatrix:${postcode}`
  if (redis) {
    const cached = await redis.get<DistMatrix>(cacheKey).catch(() => null)
    if (cached) return cached
  }

  const eligible = centres.filter(c => c.latitude != null && c.longitude != null)
  if (!eligible.length) return {}

  const result: DistMatrix = {}

  // Chunk into batches of 25 to stay within Google's per-request destination limit
  for (let i = 0; i < eligible.length; i += DIST_MATRIX_CHUNK) {
    const chunk = eligible.slice(i, i + DIST_MATRIX_CHUNK)
    const destinations = chunk.map(c => `${c.latitude},${c.longitude}`).join('|')
    const url = [
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      `?origins=${origin.lat},${origin.lng}`,
      `&destinations=${encodeURIComponent(destinations)}`,
      `&mode=driving&units=metric`,
      `&key=${GMAPS_KEY}`,
    ].join('')

    try {
      const res  = await fetch(url)
      const json = await res.json() as {
        status: string
        error_message?: string
        rows: { elements: { status: string; distance: { value: number }; duration: { value: number } }[] }[]
      }
      if (json.status !== 'OK') {
        console.error(`[DistMatrix] API error for postcode ${postcode}: ${json.status} — ${json.error_message ?? ''}`)
        continue  // don't cache partial failures — leave those centres out
      }
      if (json.rows[0]) {
        json.rows[0].elements.forEach((el, idx) => {
          if (el.status === 'OK') {
            result[chunk[idx].fitment_centre_id] = {
              distanceM: el.distance.value,
              durationS: el.duration.value,
            }
          }
        })
      }
    } catch (err) {
      console.error(`[DistMatrix] fetch error for postcode ${postcode}:`, err)
    }
  }

  // Only cache when we got at least some results — never cache a fully empty result
  // (empty = API was down or key had no permissions; caching it would poison the cache for 24h)
  if (Object.keys(result).length > 0 && redis) {
    await redis.set(cacheKey, result, { ex: TTL.DIST_MATRIX }).catch(() => {})
  }
  return result
}

// ── Fetch & calculate centre pricing (shared by both endpoints) ─────────────

interface CentrePricing {
  fitting_price:         number | null
  wheel_alignment_price: number | null   // single price from fitment_centres
}

async function fetchCentrePricing(centreId: string): Promise<CentrePricing | null> {
  const { data } = await db
    .from('fitment_centres')
    .select('fitting_price, wheel_alignment_price')
    .eq('fitment_centre_id', centreId)
    .eq('is_active', true)
    .eq('approved_status', 'approved')
    .maybeSingle()
  return data as CentrePricing | null
}

/** Calculate total fitting cost entirely server-side. */
export function calcFittingCost(
  pricing: CentrePricing,
  totalQty: number,
  wheelAlignmentType: string | null,
): number {
  const fitting   = (pricing.fitting_price ?? 0) * totalQty
  const alignment = wheelAlignmentType ? (pricing.wheel_alignment_price ?? 0) : 0
  return +fitting.toFixed(2) + +alignment.toFixed(2)
}

// ── POST /api/stripe/payment-intent ───────────────────────────────────────────
// Server-side price authority — never trusts client-supplied total.
router.post('/payment-intent', async (req, res, next) => {
  try {
    const {
      items,               // [{ product_id: string; quantity: number }]
      fitment_centre_id,   // string | null
      wheel_alignment_type, // '2_wheel' | '4_wheel' | 'single' | null
      order_ref,
    } = req.body as {
      items:               { product_id: string; quantity: number }[]
      fitment_centre_id?:  string | null
      wheel_alignment_type?: string | null
      order_ref?:          string
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'items required' })
    }

    // 1. Fetch live prices (promotion-aware) for each SKU
    const productIds = items.map(i => i.product_id)
    const { data: skus } = await db
      .from('skus')
      .select('product_id, product_prices(price_type, price_inc_gst, is_active)')
      .in('product_id', productIds)

    const priceMap: Record<string, number> = {}
    for (const sku of (skus ?? []) as { product_id: string; product_prices: { price_type: string; price_inc_gst: number; is_active: boolean }[] }[]) {
      const prices = (sku.product_prices ?? []).filter(p => p.is_active)
      const retail = prices.find(p => p.price_type === 'retail')
      if (retail) priceMap[sku.product_id] = Number(retail.price_inc_gst)
    }

    // 2. Items subtotal
    let itemsTotal = 0
    for (const item of items) {
      const price = priceMap[item.product_id] ?? 0
      itemsTotal += price * item.quantity
    }

    // 3. Fitting cost (server-side)
    let fittingCost = 0
    if (fitment_centre_id) {
      const pricing = await fetchCentrePricing(fitment_centre_id)
      if (pricing) {
        const totalQty = items.reduce((s, i) => s + i.quantity, 0)
        fittingCost = calcFittingCost(pricing, totalQty, wheel_alignment_type ?? null)
      }
    }

    const totalAud   = itemsTotal + fittingCost
    const totalCents = Math.round(totalAud * 100)

    if (totalCents < 50) {
      return res.status(400).json({ error: 'Order total too low — minimum A$0.50' })
    }

    const intent = await stripe.paymentIntents.create({
      amount:   totalCents,
      currency: 'aud',
      automatic_payment_methods: { enabled: true },
      metadata: { order_ref: order_ref ?? '', fitting_cost: fittingCost.toFixed(2) },
    })

    res.json({
      clientSecret:   intent.client_secret,
      calculatedTotal: totalAud,
      fittingCost,
      itemsTotal,
    })
  } catch (err) { next(err) }
})

// ── GET /api/stripe/fitment-centres ───────────────────────────────────────────
// Returns approved centres sorted by driving distance from customer's postcode.
// ?postcode=XXXX is optional; without it returns all sorted by name.
router.get('/fitment-centres', async (req, res, next) => {
  try {
    const postcode = String(req.query.postcode ?? '').trim().replace(/\D/g, '')

    const { data, error } = await db
      .from('fitment_centres')
      .select(`
        fitment_centre_id,
        business_name,
        contact_phone,
        fitting_price,
        wheel_alignment_price,
        mobile_fitting_available,
        opening_hours,
        latitude,
        longitude,
        addresses ( address_line1, suburb, state, postcode )
      `)
      .eq('is_active', true)
      .eq('approved_status', 'approved')
      .order('business_name')

    if (error) return next(error)
    const centres = (data as unknown as {
      fitment_centre_id:        string
      business_name:            string
      contact_phone:            string | null
      fitting_price:            number | null
      wheel_alignment_price:    number | null
      mobile_fitting_available: boolean
      opening_hours:            unknown
      latitude:                 number | null
      longitude:                number | null
      addresses:                { address_line1: string; suburb: string; state: string; postcode: string } | null
    }[]) ?? []

    // No postcode — return only mobile fitters (no lat/lng) since we can't calculate distance
    if (!postcode || !GMAPS_KEY) {
      return res.json({
        centres: centres
          .filter(c => c.mobile_fitting_available && !c.latitude && !c.longitude)
          .map(c => ({ ...c, distance_km: null, duration_min: null })),
        origin: null,
      })
    }

    // Geocode customer postcode → lat/lng
    const origin = await geocodePostcode(postcode)
    if (!origin) {
      // Invalid or unrecognised postcode — return only mobile fitters (they service anywhere)
      return res.json({
        centres: centres
          .filter(c => c.mobile_fitting_available && !c.latitude && !c.longitude)
          .map(c => ({ ...c, distance_km: null, duration_min: null })),
        origin: null,
      })
    }

    // Distance Matrix for all centres with coordinates
    const distMatrix = await getDistanceMatrix(postcode, origin, centres)

    // Enrich with real distances; keep only centres within 100 km + mobile fitters (no coords)
    const enriched = centres
      .map(c => {
        const d = distMatrix[c.fitment_centre_id]
        return {
          ...c,
          distance_km:  d ? +(d.distanceM / 1000).toFixed(1) : null,
          duration_min: d ? Math.round(d.durationS / 60) : null,
        }
      })
      .filter(c => {
        // Mobile fitters without coordinates always show
        if (c.mobile_fitting_available && !c.latitude && !c.longitude) return true
        // Centres with a real distance: keep if within 10 km
        if (c.distance_km !== null) return c.distance_km <= 10
        // Centre has coordinates but distance lookup failed — exclude
        return false
      })
      .sort((a, b) => {
        // Mobile fitters (null distance) sort to end
        if (a.distance_km === null && b.distance_km === null) return 0
        if (a.distance_km === null) return 1
        if (b.distance_km === null) return -1
        return a.distance_km - b.distance_km
      })

    res.json({ centres: enriched, origin: { lat: origin.lat, lng: origin.lng } })
  } catch (err) { next(err) }
})

// ── POST /api/stripe/admin/flush-distance-cache ───────────────────────────────
// One-shot: clears stale distmatrix:* and geocode:* keys so the next request
// re-runs the Distance Matrix API with the newly-enabled key.
// Protected by a shared secret in the Authorization header.
router.post('/admin/flush-distance-cache', async (req, res) => {
  const secret = process.env.ADMIN_CACHE_FLUSH_SECRET ?? ''
  if (!secret || req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!redis) return res.json({ flushed: 0, message: 'Redis not configured' })

  try {
    const [distKeys, geoKeys] = await Promise.all([
      redis.keys('distmatrix:*'),
      redis.keys('geocode:*'),
    ])
    const allKeys = [...distKeys, ...geoKeys]
    if (allKeys.length) await redis.del(...allKeys as [string, ...string[]])
    return res.json({ flushed: allKeys.length, keys: allKeys })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
})

export default router
