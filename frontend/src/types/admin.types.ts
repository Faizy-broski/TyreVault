/**
 * Local type definitions for admin pages.
 * Replace with `import type { Database } from './database.types'` after
 * running: npx supabase gen types typescript --project-id <id>
 */

export interface Brand {
  brand_id: string
  brand_name: string
}

export interface Collection {
  collection_id: string
  collection_name: string
}

export interface Category {
  category_id: string
  category_name: string
  category_type: string
}

export interface Warehouse {
  warehouse_id: string
  warehouse_name: string
}

export interface ProductStock {
  available_stock: number
  reserved_stock: number
  warehouses: Warehouse | null
}

export type PriceType = 'retail' | 'wholesale' | 'price_a' | 'price_b' | 'special' | 'clearance'

export interface ProductPrice {
  price_type:      PriceType
  price_inc_gst:   number
  price_ex_gst:    number
  customer_group_id: string | null
  customer_groups: { group_name: string } | null
}

export interface Sku {
  product_id: string
  sku: string
  tyre_size_display: string
  status: string
  total_available_stock: number
  width: number | null
  profile: number | null
  rim_size: number | null
  speed_rating: string | null
  load_index: string | null
  fuel_rating: string | null
  wet_grip: string | null
  noise_db: string | null
  noise_class: string | null
  runflat: boolean
  xl_reinforced: boolean
  ply_rating: string | null
  load_range: string | null
  construction_type: string | null
  load_speed_rating: string | null
  sidewall: string | null
  tube_type: string | null
  country_of_origin: string | null
  manufacturer_name: string | null
  factory_name: string | null
  factory_country: string | null
  section_width: number | null
  max_load: string | null
  max_pressure: string | null
  tread_depth: number | null
  tyre_weight: number | null
  overall_diameter: number | null
  e_mark: string | null
  dot_code: string | null
  utqg: string | null
  cost_price: number | null
  compare_at_price: number | null
  low_stock_alert: number | null
  variant_images: string[] | null
  product_stock: ProductStock[]
  product_prices: ProductPrice[]
  patterns: PatternRef | null
}

export interface PatternRef {
  pattern_id: string
  pattern_name: string
  pattern_slug: string
  brands: { brand_name: string } | null
}

export interface Pattern {
  pattern_id: string
  pattern_name: string
  pattern_slug: string
  pattern_short_description: string | null
  is_active: boolean
  show_on_website: boolean
  on_sale: boolean
  discountable: boolean
  tags: string[] | null
  gallery_images: string[] | null
  application_type: 'PCR' | '4x4' | 'TBR' | null
  updated_at: string
  created_at: string
  brands: { brand_name: string } | null
  collections: { collection_name: string } | null
  pattern_categories: { categories: { category_id: string; category_name: string } }[]
}

export interface SkuListItem {
  product_id: string
  sku: string
  tyre_size_display: string
  status: string
  total_available_stock: number
  width: number | null
  profile: number | null
  rim_size: number | null
  speed_rating: string | null
  load_index: string | null
  product_stock: { available_stock: number; warehouses: { warehouse_name: string } | null }[]
}

export interface ProfileRow {
  role: 'super_admin' | 'fitter' | 'customer'
}

// ── Orders ─────────────────────────────────────────────────────────────────

export type PaymentStatus     = 'unpaid' | 'paid' | 'partially_paid' | 'refunded'
export type OrderStatus       = 'pending' | 'paid' | 'processing' | 'fulfilled' | 'cancelled' | 'refunded'
export type ShipmentStatus    = 'awaiting_shipping' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderListItem {
  order_id:           string
  order_number:       string
  created_at:         string
  payment_status:     PaymentStatus
  order_status:       OrderStatus
  total_amount:       number
  currency:           string
  order_type:         string | null
  payment_method?:    string | null
  fitment_id:         string | null
  item_count?:        number
  shipping_address_snapshot: Record<string, string> | null
  customers:  { customer_id: string; first_name: string | null; last_name: string | null; email: string } | null
  order_items: { order_item_id: string }[]
}

export interface OrderItem {
  order_item_id: string
  product_id: string
  quantity: number
  unit_price: number
  skus: {
    sku: string
    tyre_size_display: string
  } | null
}

export interface OrderPayment {
  payment_id: string
  payment_reference: string | null
  payment_method: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export interface ShipmentItem {
  id: string
  order_item_id: string
  product_id: string
  quantity: number
  skus: { sku: string; tyre_size_display: string } | null
}

export interface OrderShipment {
  shipment_id: string
  order_id: string
  warehouse_id: string | null
  shipment_number: number
  status: ShipmentStatus
  tracking_number: string | null
  tracking_uri: string | null
  shipping_method: string | null
  created_at: string
  shipped_at: string | null
  delivered_at: string | null
  warehouses: { warehouse_name: string } | null
  order_shipment_items: ShipmentItem[]
}

export interface OrderActivity {
  activity_id: string
  event_type: string
  description: string | null
  amount: number | null
  currency: string | null
  created_at: string
}

export interface FitmentJobForOrder {
  job_id:         string
  task_number:    string
  job_status:     string
  scheduled_date: string | null
  scheduled_time: string | null
  fitment_centres: {
    fitment_id:    string
    business_name: string
  } | null
}

export interface OrderDetail {
  order_id:           string
  order_number:       string
  created_at:         string
  currency:           string
  notes:              string | null
  shipping_cost:      number
  gst_amount:         number
  discount_amount:    number
  total_amount:       number
  payment_status:     PaymentStatus
  order_status:       OrderStatus
  order_type:         string | null
  fitment_id:         string | null
  fitment_job:        FitmentJobForOrder | null
  shipping_address_snapshot: Record<string, string> | null
  billing_address_snapshot:  Record<string, string> | null
  customers: {
    customer_id: string
    email:       string
    first_name:  string | null
    last_name:   string | null
    phone:       string | null
    created_at:  string
    profile_id:  string | null
  } | null
  order_items:     OrderItem[]
  order_payments:  OrderPayment[]
  order_shipments: OrderShipment[]
  order_activity:  OrderActivity[]
}

// ── Customer Management ────────────────────────────────────────────────────

export type AccountType = 'guest' | 'registered'

export type CustomerType   = 'retail' | 'wholesale' | 'fleet' | 'trade'
export type AccountStatus  = 'active' | 'paused' | 'blocked'

export interface CustomerListItem {
  customer_id: string
  email: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
  phone: string | null
  created_at: string
  profile_id: string | null  // null = Guest, set = Registered
  customer_type?: CustomerType | null
  account_status?: AccountStatus | null
  credit_limit?: number | null
  payment_terms?: string | null
  billing_address_id?: string | null
  order_count?: number
  total_spent?: number
  last_order_number?: string | null
  last_order_date?: string | null
}

export interface Address {
  address_id: string
  customer_id?: string
  address_name: string
  address_line1: string
  address_line2: string | null
  city: string | null
  postal_code: string | null
  country: string | null
  state: string | null
  company: string | null
  phone: string | null
}

export interface CustomerGroup {
  group_id: string
  group_name: string
  customer_count: number
  created_at: string
  updated_at: string
}

export interface CustomerDetail extends CustomerListItem {
  orders: OrderListItem[]
  groups: CustomerGroup[]
  addresses: Address[]
}

// ── Fitment Centre Management ──────────────────────────────────────────────

export type CentreStatus = 'active' | 'hold'

export interface AdminFitmentCentreSummary {
  fitment_centre_id: string
  user_id:           string
  business_name:     string
  partner_id:        string
  is_active:         boolean
  contact_phone:     string | null
  business_number:   string | null
  created_at:        string
  email:             string
}

export interface AdminFitmentCentreDetail {
  fitment_centre_id: string
  user_id:           string
  business_name:     string
  partner_id:        string
  is_active:         boolean
  contact_phone:     string | null
  business_number:   string | null
  created_at:        string
  role:              string | null
  email:             string | null
}

export interface AdminCentreKPIs {
  activeJobs:          number
  thisMonthCompleted:  number
  averageRating:       number
  ratingCount:         number
  thisMonthEarnings:   number
}

export type AdminCentreJobStatus = 'pending' | 'assigned' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'

export interface AdminCentreJob {
  job_id:            string
  task_number:       string
  customer_name:     string
  customer_phone:    string | null
  scheduled_date:    string | null
  scheduled_time:    string | null
  tyre_pattern:      string | null
  tyre_size:         string | null
  quantity:          number
  vehicle_model:     string | null
  job_status:        AdminCentreJobStatus
  earnings_amount:   number | null
  fitment_id:        string
  created_at:        string
}

export interface AdminCentreStats {
  purchase12Months: { month: string; amount: number }[]
  loginHistory:     { ip: string; date: string; area: string }[]
}

// ── Payment & Settlement ───────────────────────────────────────────────────

export type PayoutStatus = 'in_progress' | 'completed' | 'failed'

export interface PaymentSummary {
  totalPaidThisYear:   number
  completedPayments:   number
  pendingPayout:       number
  lastPaymentAmount:   number
  lastPaymentDate:     string | null
  settlementSchedule:  string
}

export interface PaymentHistoryRow {
  id:               string
  period_start:     string
  period_end:       string
  order_count:      number
  gross_amount:     number
  adjustments:      number
  net_payout:       number
  status:           PayoutStatus
  payment_date:     string | null
  reference:        string | null
  invoice_url:      string | null
  created_at:       string
}

export interface BankDetails {
  id:               string | null
  fitment_centre_id: string
  account_holder:   string
  bank_name:        string
  bsb:              string | null
  account_number:   string
}

// ── Compliance & Doc ───────────────────────────────────────────────────────

export type ComplianceStatus = 'valid' | 'expired' | 'pending' | 'rejected'

// ============================================================
// Suppliers
// ============================================================
export type SupplierType        = 'factory' | 'wholesaler' | 'marketplace_partner' | '3pl'
export type StockAccessType     = 'owned_after_purchase' | 'consignment' | 'live_supplier_stock'

export interface Supplier {
  supplier_id:       string
  supplier_name:     string
  supplier_type:     SupplierType | null
  contact_name:      string | null
  email:             string | null
  phone:             string | null
  state:             string | null
  country:           string | null
  payment_terms:     string | null
  stock_access_type: StockAccessType | null
  api_connected:     boolean
  is_active:         boolean
  created_at:        string
  updated_at:        string
  // hydrated by getSupplier
  stats?: {
    auto_mapped:    number
    pending_review: number
  }
}

export interface SupplierMapping {
  id:                    string
  supplier_sku:          string | null
  supplier_product_name: string | null
  supplier_brand_name:   string | null
  supplier_pattern_name: string | null
  supplier_size_raw:     string | null
  normalized_size_code:  string | null
  load_index:            string | null
  speed_rating:          string | null
  supplier_price:        number | null
  supplier_stock:        number | null
  match_confidence:      number | null
  is_verified:           boolean
  last_updated:          string | null
  product_id:            string | null
  // joined
  skus: {
    sku:               string
    tyre_size_display: string
    brands:   { brand_name:   string } | null
    patterns: { pattern_name: string } | null
  } | null
}

export type ImportJobState = 'waiting' | 'active' | 'completed' | 'failed' | 'not_found' | 'unknown'

export interface ImportJobStatus {
  state:       ImportJobState
  progress:    number
  result?:     { auto_mapped: number; review_queue: number; rejected: number } | null
  failReason?: string | null
}

export interface ComplianceDoc {
  id:               string
  policy_type:      string
  provider:         string | null
  policy_number:    string | null
  expiry_date:      string | null
  status:           ComplianceStatus
  doc_url:          string | null
  created_at:       string
  updated_at:       string
}
