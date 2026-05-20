import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { errorMiddleware } from './middleware/error.middleware'

const app = express()
const PORT = process.env.PORT || 3001

// --- Security & compression ---
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

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
import fitterRoutes             from './routes/fitter.routes'
import fitterPortalRoutes       from './routes/fitter-portal.routes'
import storefrontProductsRoutes from './routes/storefront.products.routes'
import cartRoutes               from './routes/cart.routes'
app.use('/api/admin/products',         adminProductsRoutes)
app.use('/api/admin/customers',        adminCustomersRoutes)
app.use('/api/admin/orders',           adminOrdersRoutes)
app.use('/api/admin/fitment-centres',  adminFitmentCentresRoutes)
app.use('/api/admin/suppliers',        adminSuppliersRoutes)
app.use('/api/fitter',                 fitterRoutes)
app.use('/api/fitter/portal',          fitterPortalRoutes)
app.use('/api/products',               storefrontProductsRoutes)
app.use('/api/cart',                   cartRoutes)
// app.use('/api/orders', orderRoutes)
// app.use('/api/shipping', shippingRoutes)
// app.use('/api/stripe', stripeRoutes)
// app.use('/api/make-model', makeModelRoutes)

// --- Error handler (must be last) ---
app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(`Onyx backend running on port ${PORT}`)
})

export default app
