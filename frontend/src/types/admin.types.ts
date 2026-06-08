/**
 * Local type definitions for admin pages.
 * Replace with `import type { Database } from './database.types'` after
 * running: npx supabase gen types typescript --project-id <id>
 */

export interface Brand {
  brand_id: string
  brand_name: string
  brand_slug: string
  brand_logo: string | null
  brand_banner_image: string | null
  brand_description: string | null
  brand_short_description: string | null
  country_of_brand: string | null
  manufacturer_name: string | null
  brand_positioning: 'budget' | 'mid_range' | 'premium' | 'commercial' | null
  warranty_info: string | null
  seo_title: string | null
  seo_description: string | null
  is_active: boolean
  show_on_website: boolean
  channel_wholesale: boolean
  channel_retail: boolean
  channel_marketplaces: boolean
  created_at: string
  updated_at: string
}

export interface Collection {
  collection_id: string
  collection_name: string
}

export type CategoryType = 'season' | 'application' | 'performance' | 'position' | 'terrain'

export interface Category {
  category_id:          string
  category_name:        string
  category_slug:        string
  category_type:        CategoryType | string
  parent_category_id:   string | null
  description:          string | null
  image:                string | null
  sort_order:           number | null
  is_active:            boolean
  hidden_from_website:  boolean
  created_at:           string
}

export type WarehouseType = 'own' | 'supplier' | '3pl'

export interface Warehouse {
  warehouse_id:          string
  warehouse_name:        string
  warehouse_type:        WarehouseType
  state:                 string
  suburb:                string | null
  postcode:              string | null
  address:               string | null
  contact_name:          string | null
  contact_phone:         string | null
  contact_email:         string | null
  is_own_warehouse:      boolean
  is_supplier_warehouse: boolean
  is_active:             boolean
  created_at:            string
}

export interface ProductStock {
  stock_id:            string
  available_stock:     number
  reserved_stock:      number
  incoming_stock:      number
  in_transit_stock:    number
  damaged_stock:       number
  minimum_stock_level: number
  last_stock_update:   string | null
  warehouses:          Warehouse | null
}

export type PriceType = 'retail' | 'wholesale' | 'price_a' | 'price_b' | 'special' | 'clearance'

export interface ProductPrice {
  price_id:          string
  price_type:        PriceType
  price_inc_gst:     number
  price_ex_gst:      number
  customer_group_id: string | null
  warehouse_id:      string | null
  start_date:        string | null
  end_date:          string | null
  is_active:         boolean
  customer_groups:   { group_name: string } | null
  warehouses:        { warehouse_name: string } | null
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
  barcode_ean: string | null
  special_size: string | null
  lt_sizing: boolean
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
  replacement_product_id: string | null
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
  pattern_id:                string
  pattern_name:              string
  pattern_slug:              string
  brand_id:                  string | null
  collection_id:             string | null
  pattern_description:       string | null
  pattern_short_description: string | null
  main_image:                string | null
  gallery_images:            string[] | null
  tread_image:               string | null
  application_type:          'PCR' | '4x4' | 'TBR' | null
  season_type:               string | null
  performance_category:      string | null
  position_category:         string | null
  shoulder_type:             string | null
  terrain_type:              string | null
  default_country_of_origin: string | null
  warranty_km:               number | null
  seo_title:                 string | null
  seo_description:           string | null
  tyre_overview:             string | null
  features:                  string | null
  warranty_information:      string | null
  tyre_spec_sheet:           string | null
  faq_list:                  { question: string; answer: string }[] | null
  is_active:                 boolean
  show_on_website:           boolean
  on_sale:                   boolean
  discountable:              boolean
  tags:                      string[] | null
  updated_at:                string
  created_at:                string
  brands:            { brand_id: string; brand_name: string; brand_slug: string; brand_logo: string | null } | null
  collections:       { collection_id: string; collection_name: string } | null
  pattern_categories: { categories: { category_id: string; category_name: string; category_type?: string } | null }[]
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
  product_stock: { available_stock: number; reserved_stock: number; incoming_stock: number; in_transit_stock: number; damaged_stock: number; minimum_stock_level: number; warehouses: { warehouse_name: string } | null }[]
}

export interface ProfileRow {
  role: 'super_admin' | 'fitter' | 'customer'
}

// ── Orders ─────────────────────────────────────────────────────────────────

export type PaymentStatus     = 'unpaid' | 'paid' | 'partially_paid' | 'refunded'
export type OrderStatus       = 'pending' | 'paid' | 'processing' | 'fulfilled' | 'cancelled' | 'refunded'
export type OrderShipmentStatus = 'awaiting_shipping' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderListItem {
  order_id:           string
  order_number:       string
  created_at:         string
  payment_status:     PaymentStatus
  order_status:       OrderStatus
  total_amount:       number
  currency:           string
  order_type:         string | null
  fulfilment_type:    string | null
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
  product_type: 'tyre' | 'wheel' | 'service'
  quantity: number
  unit_price: number
  warehouse_id: string | null
  supplier_id: string | null
  fulfilment_source: 'own_stock' | 'supplier_stock' | '3pl_stock' | 'incoming_stock'
  reserved_qty: number | null
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
  status: OrderShipmentStatus
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
    fitment_centre_id: string
    business_name:     string
  } | null
}

export interface OrderDetail {
  order_id:           string
  order_number:       string
  created_at:         string
  currency:           string
  notes:              string | null
  shipping_cost:      number
  fitting_cost:       number
  gst_amount:         number
  discount_amount:    number
  total_amount:       number
  payment_status:     PaymentStatus
  order_status:       OrderStatus
  order_type:         string | null
  fulfilment_type:    string | null
  fitment_id:         string | null
  fitment_job:        FitmentJobForOrder | null
  warehouse_id:       string | null
  shipping_address_id: string | null
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
  customer_id:        string
  email:              string
  first_name:         string | null
  last_name:          string | null
  business_name:      string | null
  phone:              string | null
  created_at:         string
  profile_id:         string | null  // null = Guest, set = Registered
  customer_type:      CustomerType | null
  account_status:     AccountStatus | null
  credit_limit:       number | null
  payment_terms:      string | null
  billing_address_id: string | null
  customer_group_id:  string | null
  order_count?:       number
  total_spent?:       number
  last_order_number?: string | null
  last_order_date?:   string | null
}

export type AddressOwnerType = 'customer' | 'warehouse' | 'supplier' | 'fitter'

export interface Address {
  address_id:     string
  // Polymorphic owner fields (spec)
  owner_type:     AddressOwnerType | null
  owner_id:       string | null
  address_name:   string
  // Spec column names
  address_line_1: string
  address_line_2: string | null
  suburb:         string | null
  postcode:       string | null
  state:          string | null
  country:        string | null
  is_default:     boolean
  latitude:       number | null
  longitude:      number | null
  phone:          string | null
  // Legacy field names (backward compat — still returned by DB)
  customer_id?:   string
  address_line1?: string
  address_line2?: string | null
  city?:          string | null
  postal_code?:   string | null
  company?:       string | null
}

export interface CustomerGroup {
  group_id:           string
  group_name:         string
  description:        string | null
  default_discount:   number | null
  discount_type:      string | null
  discount_value:     number | null
  price_type:         string | null
  can_view_wholesale: boolean
  is_active:          boolean
  customer_count:     number
  created_at:         string
  updated_at:         string
}

export interface CustomerDetail extends CustomerListItem {
  orders:    OrderListItem[]
  groups:    CustomerGroup[]
  addresses: Address[]
}

// ── Fitment Centre Management ──────────────────────────────────────────────

export type CentreStatus = 'active' | 'hold'

export interface AdminFitmentCentreSummary {
  fitment_centre_id:  string
  user_id:            string
  business_name:      string
  partner_id:         string
  is_active:          boolean
  approved_status:    'pending' | 'approved' | 'rejected' | 'suspended'
  contact_phone:      string | null
  business_number:    string | null
  created_at:         string
  email:              string
}

export interface AdminFitmentCentreDetail {
  fitment_centre_id:        string
  user_id:                  string
  business_name:            string
  contact_name:             string | null
  contact_phone:            string | null
  phone:                    string | null
  email:                    string | null
  business_number:          string | null
  partner_id:               string
  is_active:                boolean
  approved_status:          'pending' | 'approved' | 'rejected' | 'suspended'
  // Location
  address_id:               string | null
  latitude:                 number | null
  longitude:                number | null
  // Spec service fields
  fitting_price:            number | null
  wheel_alignment_price:    number | null
  mobile_fitting_available: boolean
  preferred_partner:        boolean
  opening_hours:            unknown | null
  services_offered:         string[]
  created_at:               string
  role:                     string | null
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
  job_id:                string
  order_id:              string | null
  fitment_centre_id:     string
  customer_id:           string | null
  task_number:           string
  customer_name:         string
  customer_phone:        string | null
  scheduled_date:        string | null
  scheduled_time:        string | null
  tyre_pattern:          string | null
  tyre_size:             string | null
  quantity:              number
  vehicle_model:         string | null
  job_status:            AdminCentreJobStatus
  notes:                 string | null
  fitter_notes:          string | null
  admin_notes:           string | null
  assigned_by_admin_id:  string | null
  accepted_at:           string | null
  completed_at:          string | null
  earnings_amount:       number | null
  created_at:            string
  updated_at:            string
}

export interface AdminJobItem {
  job_item_id:  string
  product_id:   string | null
  quantity:     number
  service_type: 'fit_only' | 'supply_and_fit' | 'alignment' | null
  unit_price:   number | null
}

export interface AdminJobDetail extends AdminCentreJob {
  items: AdminJobItem[]
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
export type SupplierType           = 'factory' | 'wholesaler' | 'marketplace_partner' | '3pl'
export type StockAccessType        = 'owned_after_purchase' | 'consignment' | 'live_supplier_stock'
export type SupplierConnectionType = 'api_link' | 'edi' | 'csv' | 'manual'

export interface Supplier {
  supplier_id:       string
  supplier_name:     string
  supplier_type:     SupplierType | null
  connection_type:   SupplierConnectionType | null
  contact_name:      string | null
  contact_email:     string | null
  contact_phone:     string | null
  state:             string | null
  country:           string | null
  payment_terms:     string | null
  stock_access_type: StockAccessType | null
  api_connected:     boolean
  api_endpoint:      string | null
  api_key:           string | null
  api_auth_type:     'api_key' | 'bearer' | 'basic' | null
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

// ── Mapping View (split-panel interface) ──────────────────────────────────────

export type MappingStatus = 'mapped_synced' | 'mapped' | 'pending_review' | 'unmatched'

export interface SyncedStock {
  available_stock:    number
  supplier_price:     number | null
  stock_last_updated: string | null
}

export interface MappingViewRow {
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
  lead_time_days:        number | null
  match_confidence:      number | null
  is_verified:           boolean
  last_updated:          string | null
  product_id:            string | null
  skus: {
    sku:               string
    tyre_size_display: string
    brands:   { brand_name:   string } | null
    patterns: { pattern_name: string } | null
  } | null
  synced_stock: SyncedStock | null
  status: MappingStatus
}

export interface MappingParams {
  size:             number
  brand:            number
  pattern:          number
  load_speed:       number
  auto_threshold:   number
  review_threshold: number
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

// ── Inbound Shipments ─────────────────────────────────────────────────────────

export type ShipmentStatus  = 'planned' | 'shipped' | 'arrived' | 'received' | 'cancelled'
export type ClearanceStatus = 'pending' | 'cleared' | 'delayed'

export interface Shipment {
  shipment_id:       string
  shipment_status:   ShipmentStatus
  clearance_status:  ClearanceStatus | null
  container_number:  string | null
  vessel_name:       string | null
  booking_reference: string | null
  etd:               string | null
  eta:               string | null
  arrival_date:      string | null
  created_at:        string
  updated_at:        string | null
  purchase_orders:   {
    po_id:     string
    po_number: string
    po_status: string
    order_date: string
    suppliers: { supplier_id: string; supplier_name: string } | null
  } | null
  warehouses: { warehouse_id: string; warehouse_name: string } | null
}

export interface ShipmentListItem {
  shipment_id:       string
  shipment_status:   ShipmentStatus
  clearance_status:  ClearanceStatus | null
  container_number:  string | null
  vessel_name:       string | null
  booking_reference: string | null
  etd:               string | null
  eta:               string | null
  arrival_date:      string | null
  created_at:        string
  purchase_orders:   { po_id: string; po_number: string } | null
  warehouses:        { warehouse_id: string; warehouse_name: string } | null
}

// ── Purchase Orders ────────────────────────────────────────────────────────────

export type PoStatus = 'draft' | 'ordered' | 'shipped' | 'arrived' | 'received' | 'cancelled'

export interface PurchaseOrderItem {
  po_item_id:           string
  po_id:                string
  product_id:           string
  quantity_ordered:     number
  quantity_received:    number
  unit_cost:            number
  landed_cost_per_unit: number | null
  cbm_per_unit:         number | null
  skus: { sku: string; tyre_size_display: string } | null
}

export interface PurchaseOrder {
  po_id:          string
  po_number:      string
  po_status:      PoStatus
  order_date:     string
  shipment_date:  string | null
  eta_date:       string | null
  currency:       string
  exchange_rate:  number | null
  freight_cost:   number | null
  clearance_cost: number | null
  total_cost:     number | null
  notes:          string | null
  created_at:     string
  updated_at:     string | null
  suppliers:  { supplier_id: string; supplier_name: string; contact_email: string | null; contact_phone: string | null } | null
  warehouses: { warehouse_id: string; warehouse_name: string } | null
  purchase_order_items: PurchaseOrderItem[]
}

export interface PurchaseOrderListItem {
  po_id:         string
  po_number:     string
  po_status:     PoStatus
  order_date:    string
  shipment_date: string | null
  eta_date:      string | null
  currency:      string
  total_cost:    number | null
  freight_cost:  number | null
  clearance_cost: number | null
  created_at:    string
  suppliers:  { supplier_id: string; supplier_name: string } | null
  warehouses: { warehouse_id: string; warehouse_name: string } | null
  purchase_order_items: { po_item_id: string }[]
}

// ── Shipping ────────────────────────────────────────────────────────────────

export type ShippingMethodType = 'own_fleet' | 'courier_api' | '3pl' | 'supplier_direct' | 'pickup'

export interface AdminShippingMethod {
  shipping_method_id: string
  method_name:        string
  method_type:        ShippingMethodType | null
  api_provider:       string | null
  is_active:          boolean
  created_at:         string
}

export interface AdminShippingQuote {
  quote_id:                string
  order_id:                string | null
  warehouse_id:            string
  destination_postcode:    string
  shipping_method_id:      string
  courier_name:            string | null
  freight_cost:            number
  customer_charge:         number
  estimated_delivery_days: number | null
  api_response:            Record<string, unknown> | null
  created_at:              string
  shipping_methods:        { method_name: string; method_type: ShippingMethodType | null } | null
  warehouses:              { warehouse_name: string } | null
}

// ── Wheels ───────────────────────────────────────────────────────────────────

export type WheelStyleCategory = '4x4' | 'street' | 'luxury' | 'commercial'

export interface WheelBrand {
  wheel_brand_id: string
  brand_name:     string
  logo:           string | null
  description:    string | null
  is_active:      boolean
  created_at:     string
}

export interface AdminWheel {
  wheel_id:        string
  wheel_brand_id:  string
  model_name:      string
  model_slug:      string
  description:     string | null
  main_image:      string | null
  gallery_images:  string[]
  style_category:  WheelStyleCategory | null
  finish:          string | null
  colour:          string | null
  is_active:       boolean
  created_at:      string
  updated_at:      string
  wheel_brands:    { brand_name: string } | null
  variant_count:   number
}

export interface AdminWheelVariant {
  wheel_variant_id: string
  wheel_id:         string
  sku:              string
  diameter:         number
  width:            number
  pcd:              string
  offset:           number
  centre_bore:      number | null
  load_rating:      number | null
  price:            number | null
  is_active:        boolean
  created_at:       string
}

export interface AdminWheelDetail extends Omit<AdminWheel, 'variant_count'> {
  wheel_variants: AdminWheelVariant[]
}

// ── Vehicles & Fitments ──────────────────────────────────────────────────────

export interface AdminVehicle {
  vehicle_id: string
  make:       string
  model:      string
  year_from:  number
  year_to:    number | null
  series:     string | null
  variant:    string | null
  body_type:  string | null
  created_at: string
}

export interface VehicleTyreFitment {
  fitment_id:   string
  vehicle_id:   string
  front_size:   string
  rear_size:    string | null
  is_staggered: boolean
  notes:        string | null
}

export interface VehicleWheelFitment {
  fitment_id:     string
  vehicle_id:     string
  pcd:            string
  diameter_range: string | null
  width_range:    string | null
  offset_min:     number | null
  offset_max:     number | null
  centre_bore:    number | null
  notes:          string | null
}

export interface AdminVehicleDetail extends AdminVehicle {
  vehicle_tyre_fitments:  VehicleTyreFitment[]
  vehicle_wheel_fitments: VehicleWheelFitment[]
}
