import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { errorMiddleware } from './middleware/error.middleware'

const app = express()
const PORT = process.env.PORT || 3001

// EC2 is behind nginx/ALB — trust the first proxy hop so that
// express-rate-limit reads the real client IP from X-Forwarded-For
// instead of throwing a ValidationError and crashing the process.
app.set('trust proxy', 1)

// --- Security & compression ---
app.use(helmet())
app.use(compression())
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return cb(null, true)
    // Strip trailing slash/dot for comparison
    const clean = origin.replace(/[./]+$/, '')
    if (ALLOWED_ORIGINS.some(o => o.replace(/[./]+$/, '') === clean)) {
      return cb(null, origin)  // Echo the exact origin back — avoids duplicate-header conflicts with nginx
    }
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true }))

// --- Rate limiting ---
const importLimiter = rateLimit({ windowMs: 60_000, max: 5,  standardHeaders: true, legacyHeaders: false })
const checkoutLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false })

// --- Performance audit middleware (remove after profiling confirms fixes) ---
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  const originalJson = res.json.bind(res)
  let payloadBytes = 0

  res.json = (body: unknown) => {
    const serialized = JSON.stringify(body)
    payloadBytes = Buffer.byteLength(serialized, 'utf8')
    return originalJson(body)
  }

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000
    if (ms > 200) {
      console.warn(
        `[SLOW] ${req.method} ${req.originalUrl} → ${res.statusCode} | ${ms.toFixed(1)}ms | ${(payloadBytes / 1024).toFixed(1)}KB`
      )
    }
  })

  next()
})

// --- Health check ---
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// --- Routes ---
import adminProductsRoutes      from './routes/admin.products.routes'
import adminCustomersRoutes     from './routes/admin.customers.routes'
import adminOrdersRoutes        from './routes/admin.orders.routes'
import adminFitmentCentresRoutes from './routes/admin.fitment-centres.routes'
import adminSuppliersRoutes     from './routes/admin.suppliers.routes'
import adminAddressesRoutes     from './routes/admin.addresses.routes'
import fitterRoutes             from './routes/fitter.routes'
import fitterPortalRoutes       from './routes/fitter-portal.routes'
import storefrontProductsRoutes from './routes/storefront.products.routes'
import cartRoutes               from './routes/cart.routes'
import stripeRoutes             from './routes/stripe.routes'
import ordersRoutes             from './routes/orders.routes'
import adminSettingsRoutes      from './routes/admin.settings.routes'
import adminPromotionsRoutes    from './routes/admin.promotions.routes'
import adminPurchaseOrdersRoutes from './routes/admin.purchase-orders.routes'
import adminShipmentsRoutes      from './routes/admin.shipments.routes'
import adminShippingRoutes       from './routes/admin.shipping.routes'
import adminWheelsRoutes         from './routes/admin.wheels.routes'
import adminVehiclesRoutes       from './routes/admin.vehicles.routes'
import adminInventoryRoutes      from './routes/admin.inventory.routes'
import vehiclesRoutes           from './routes/vehicles.routes'
import sseRoutes                from './routes/sse.routes'
import customerAccountRoutes    from './routes/customer-account.routes'
import storefrontTrackingRoutes from './routes/storefront.tracking.routes'
app.use('/api/admin/products',          adminProductsRoutes)
app.use('/api/admin/customers',         adminCustomersRoutes)
app.use('/api/admin/orders',            adminOrdersRoutes)
app.use('/api/admin/fitment-centres',   adminFitmentCentresRoutes)
app.use('/api/admin/suppliers',         adminSuppliersRoutes)
app.use('/api/admin/addresses',         adminAddressesRoutes)
app.use('/api/admin/settings',          adminSettingsRoutes)
app.use('/api/admin/promotions',        adminPromotionsRoutes)
app.use('/api/admin/purchase-orders',   adminPurchaseOrdersRoutes)
app.use('/api/admin/shipments',         adminShipmentsRoutes)
app.use('/api/admin/shipping',          adminShippingRoutes)
app.use('/api/admin/wheels',            adminWheelsRoutes)
app.use('/api/admin/vehicles',          adminVehiclesRoutes)
app.use('/api/admin/inventory',         adminInventoryRoutes)
app.use('/api/vehicles',               vehiclesRoutes)
app.use('/api/sse',                    sseRoutes)
app.use('/api/fitter',                 fitterRoutes)
app.use('/api/fitter/portal',          fitterPortalRoutes)
app.use('/api/products',               storefrontProductsRoutes)
app.use('/api/cart',                   cartRoutes)
app.use('/api/stripe',                 stripeRoutes)
app.use('/api/orders',                 ordersRoutes)
app.use('/api/customer',               customerAccountRoutes)
app.use('/api',                        storefrontTrackingRoutes)
// app.use('/api/make-model', makeModelRoutes)

// --- Error handler (must be last) ---
app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(`Onyx backend running on port ${PORT}`)
})

export default app
