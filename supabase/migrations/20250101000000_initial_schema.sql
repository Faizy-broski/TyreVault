-- =============================================================================
-- Onyx Tyres & Autoparts — Complete Initial Schema
-- Single consolidated migration. Run once on a clean database.
-- =============================================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE brand_positioning_type   AS ENUM ('budget','mid_range','premium','commercial');
CREATE TYPE application_type         AS ENUM ('PCR','4x4','TBR');
CREATE TYPE season_type              AS ENUM ('summer','winter','all_season');
CREATE TYPE performance_category_type AS ENUM ('HP','UHP','HT','AT','RT','MT','XT','ECO','COMMERCIAL');
CREATE TYPE position_category_type   AS ENUM ('steer','drive','trailer','all_position');
CREATE TYPE shoulder_type            AS ENUM ('open_shoulder','closed_shoulder','block_drive');
CREATE TYPE terrain_type             AS ENUM ('highway','all_terrain','mud_terrain','on_off_road');
CREATE TYPE construction_type        AS ENUM ('R','ZR','D','B');
CREATE TYPE sidewall_type            AS ENUM ('BSW','OWL','RWL','WSW');
CREATE TYPE tube_type                AS ENUM ('tubeless','tube_type');
CREATE TYPE sku_status               AS ENUM ('active','inactive','discontinued');
CREATE TYPE category_type            AS ENUM ('season','application','performance','position','terrain');
CREATE TYPE warehouse_type           AS ENUM ('own','supplier','3pl');
CREATE TYPE supplier_type            AS ENUM ('factory','wholesaler','marketplace_partner','3pl');
CREATE TYPE stock_access_type        AS ENUM ('owned_after_purchase','consignment','live_supplier_stock');
CREATE TYPE po_status                AS ENUM ('draft','ordered','shipped','arrived','received','cancelled');
CREATE TYPE clearance_status         AS ENUM ('pending','cleared','delayed');
CREATE TYPE price_type               AS ENUM ('retail','wholesale','price_a','price_b','special','clearance');
CREATE TYPE user_role                AS ENUM ('super_admin','fitter','customer');
CREATE TYPE fitment_approved_status  AS ENUM ('pending','approved','rejected','suspended');
CREATE TYPE service_type             AS ENUM ('fit_only','supply_and_fit','alignment');
CREATE TYPE discount_type            AS ENUM ('percent','fixed_amount','bundle');
CREATE TYPE promotion_applies_to     AS ENUM ('product','pattern','brand','category','customer_group');
CREATE TYPE wheel_style_category     AS ENUM ('4x4','street','luxury','commercial');

-- ─── SHARED updated_at FUNCTION ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =============================================================================
-- CORE PRODUCT TABLES
-- =============================================================================

CREATE TABLE brands (
  brand_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name              TEXT NOT NULL,
  brand_slug              TEXT NOT NULL UNIQUE,
  brand_logo              TEXT,
  brand_banner_image      TEXT,
  brand_description       TEXT,
  brand_short_description TEXT,
  country_of_brand        TEXT,
  manufacturer_name       TEXT,
  brand_positioning       brand_positioning_type,
  warranty_info           TEXT,
  seo_title               TEXT,
  seo_description         TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_website         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patterns (
  pattern_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id                 UUID NOT NULL REFERENCES brands(brand_id) ON DELETE RESTRICT,
  pattern_name             TEXT NOT NULL,
  pattern_slug             TEXT NOT NULL,
  pattern_description      TEXT,
  pattern_short_description TEXT,
  main_image               TEXT,
  gallery_images           TEXT[]   DEFAULT '{}',
  tread_image              TEXT,
  application_type         application_type NOT NULL,
  season_type              season_type,
  performance_category     performance_category_type,
  position_category        position_category_type,
  shoulder_type            shoulder_type,
  terrain_type             terrain_type,
  default_country_of_origin TEXT,
  warranty_km              INTEGER,
  seo_title                TEXT,
  seo_description          TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_website          BOOLEAN NOT NULL DEFAULT TRUE,
  on_sale                  BOOLEAN NOT NULL DEFAULT FALSE,
  discountable             BOOLEAN NOT NULL DEFAULT TRUE,
  tags                     TEXT[]   DEFAULT '{}',
  tyre_overview            TEXT,
  features                 TEXT,
  warranty_information     TEXT,
  tyre_spec_sheet          TEXT,
  faq_list                 JSONB    DEFAULT '[]',
  collection_id            UUID,    -- FK added after collections table
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, pattern_slug)
);

CREATE TABLE skus (
  product_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                   TEXT NOT NULL UNIQUE,
  brand_id              UUID NOT NULL REFERENCES brands(brand_id) ON DELETE RESTRICT,
  pattern_id            UUID NOT NULL REFERENCES patterns(pattern_id) ON DELETE RESTRICT,
  tyre_size_display     TEXT NOT NULL,
  normalized_size_code  TEXT NOT NULL,
  width                 NUMERIC(6,2),
  profile               NUMERIC(6,2),
  rim_size              NUMERIC(6,2) NOT NULL,
  construction_type     construction_type,
  load_index            TEXT,
  speed_rating          TEXT,
  load_speed_rating     TEXT,
  xl_reinforced         BOOLEAN DEFAULT FALSE,
  runflat               BOOLEAN DEFAULT FALSE,
  ply_rating            TEXT,
  load_range            TEXT,
  sidewall              sidewall_type,
  tube_type             tube_type,
  country_of_origin     TEXT NOT NULL,
  factory_name          TEXT,
  factory_country       TEXT,
  manufacturer_name     TEXT,
  tread_depth           NUMERIC(5,2),
  tyre_weight           NUMERIC(6,2),
  overall_diameter      NUMERIC(7,2),
  section_width         NUMERIC(7,2),
  max_load              TEXT,
  max_pressure          TEXT,
  wet_grip              TEXT,
  fuel_rating           TEXT,
  noise_db              TEXT,
  noise_class           TEXT,
  e_mark                TEXT,
  dot_code              TEXT,
  utqg                  TEXT,
  status                sku_status NOT NULL DEFAULT 'active',
  replacement_product_id UUID REFERENCES skus(product_id),
  total_available_stock INTEGER NOT NULL DEFAULT 0,
  cost_price            NUMERIC(10,2),
  compare_at_price      NUMERIC(10,2),
  low_stock_alert       INTEGER DEFAULT 10,
  variant_images        TEXT[] DEFAULT '{}',
  seo_title             TEXT,
  seo_description       TEXT,
  product_slug          TEXT UNIQUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  category_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_category_id UUID REFERENCES categories(category_id),
  category_name      TEXT NOT NULL,
  category_slug      TEXT NOT NULL UNIQUE,
  category_type      category_type NOT NULL,
  description        TEXT,
  image              TEXT,
  sort_order         INTEGER DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collections (
  collection_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_name TEXT NOT NULL,
  collection_slug TEXT NOT NULL UNIQUE,
  description     TEXT,
  image           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK after collections exists
ALTER TABLE patterns ADD CONSTRAINT fk_patterns_collection
  FOREIGN KEY (collection_id) REFERENCES collections(collection_id) ON DELETE SET NULL;

CREATE TABLE product_categories (
  product_id  UUID NOT NULL REFERENCES skus(product_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE pattern_categories (
  pattern_id  UUID NOT NULL REFERENCES patterns(pattern_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  PRIMARY KEY (pattern_id, category_id)
);

-- =============================================================================
-- INVENTORY TABLES
-- =============================================================================

CREATE TABLE warehouses (
  warehouse_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_name        TEXT NOT NULL,
  warehouse_type        warehouse_type NOT NULL,
  state                 TEXT NOT NULL,
  suburb                TEXT,
  postcode              TEXT,
  address               TEXT,
  contact_name          TEXT,
  contact_phone         TEXT,
  contact_email         TEXT,
  is_own_warehouse      BOOLEAN NOT NULL DEFAULT FALSE,
  is_supplier_warehouse BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_stock (
  stock_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES skus(product_id) ON DELETE CASCADE,
  warehouse_id     UUID NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
  available_stock  INTEGER NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
  reserved_stock   INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  reorder_point    INTEGER DEFAULT 5,
  low_stock_alert  INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, warehouse_id)
);

CREATE TABLE suppliers (
  supplier_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name  TEXT NOT NULL,
  supplier_type  supplier_type NOT NULL,
  contact_name   TEXT,
  contact_email  TEXT,
  contact_phone  TEXT,
  country        TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_product_stock (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id    UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES skus(product_id) ON DELETE CASCADE,
  warehouse_id   UUID REFERENCES warehouses(warehouse_id),
  available_qty  INTEGER NOT NULL DEFAULT 0,
  price          NUMERIC(10,2),
  lead_time_days INTEGER DEFAULT 3,
  selling_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, product_id)
);

CREATE TABLE supplier_product_map (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES skus(product_id) ON DELETE CASCADE,
  supplier_sku    TEXT,
  confidence      NUMERIC(5,2),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, product_id)
);

CREATE TABLE purchase_orders (
  po_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id    UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
  warehouse_id   UUID NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
  status         po_status NOT NULL DEFAULT 'draft',
  expected_date  DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_items (
  po_item_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id        UUID NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES skus(product_id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost    NUMERIC(10,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- PRICING, CUSTOMER & ORDER TABLES
-- =============================================================================

-- customer_groups — PK is group_id (matches backend + file 12 FK)
CREATE TABLE customer_groups (
  group_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name       TEXT NOT NULL,
  default_discount NUMERIC(5,2) DEFAULT 0,
  can_view_wholesale BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  customer_count   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO customer_groups (group_name, can_view_wholesale) VALUES
  ('Retail',    FALSE),
  ('Wholesale', TRUE),
  ('Platinum',  TRUE),
  ('Fleet',     TRUE),
  ('Trade',     TRUE);

CREATE TABLE product_prices (
  price_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES skus(product_id) ON DELETE CASCADE,
  price_type        price_type NOT NULL,
  customer_group_id UUID REFERENCES customer_groups(group_id) ON DELETE SET NULL,
  warehouse_id      UUID REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
  price_ex_gst      NUMERIC(10,2) NOT NULL CHECK (price_ex_gst >= 0),
  price_inc_gst     NUMERIC(10,2) NOT NULL CHECK (price_inc_gst >= 0),
  start_date        DATE,
  end_date          DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- profiles — extends auth.users with role
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- customers — company (not business_name), email unique
CREATE TABLE customers (
  customer_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email             TEXT NOT NULL UNIQUE,
  first_name        TEXT,
  last_name         TEXT,
  company           TEXT,
  phone             TEXT,
  customer_group_id UUID REFERENCES customer_groups(group_id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- addresses — customer-scoped, correct column names matching backend
CREATE TABLE addresses (
  address_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  address_name  TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city          TEXT,
  state         TEXT,
  postal_code   TEXT,
  country       TEXT DEFAULT 'Australia',
  company       TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- customer_group_members — multi-group membership
CREATE TABLE customer_group_members (
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  group_id    UUID NOT NULL REFERENCES customer_groups(group_id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, group_id)
);

-- orders — VARCHAR statuses (not enums), includes delivery_method
CREATE TABLE orders (
  order_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        TEXT UNIQUE,
  customer_id         UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  payment_status      VARCHAR(50)   NOT NULL DEFAULT 'pending',
  -- pending | success | failed | refunded
  fulfillment_status  VARCHAR(50)   NOT NULL DEFAULT 'unfulfilled',
  -- unfulfilled | partially_fulfilled | fulfilled | awaiting_shipping | shipped | delivered | cancelled
  delivery_method     VARCHAR(50)   DEFAULT 'home_delivery',
  -- home_delivery | fitment_centre | pickup
  fitment_centre_id   UUID,         -- FK added after fitment_centres exists
  payment_method      VARCHAR(50),
  currency            VARCHAR(3)    NOT NULL DEFAULT 'AUD',
  subtotal_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  outstanding_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  shipping_address_snapshot JSONB,
  billing_address_snapshot  JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_item_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES skus(product_id) ON DELETE RESTRICT,
  quantity           INTEGER NOT NULL CHECK (quantity > 0),
  unit_price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  fulfilled_quantity INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_payments (
  payment_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  payment_reference TEXT,
  payment_method    TEXT NOT NULL DEFAULT 'manual',
  amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency          VARCHAR(3) NOT NULL DEFAULT 'AUD',
  status            VARCHAR(50) NOT NULL DEFAULT 'pending',
  stripe_payment_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_shipments (
  shipment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  warehouse_id      UUID REFERENCES warehouses(warehouse_id),
  shipment_number   INTEGER NOT NULL DEFAULT 1,
  status            VARCHAR(50) NOT NULL DEFAULT 'awaiting_shipping',
  tracking_number   TEXT,
  tracking_uri      TEXT,
  shipping_method   TEXT,
  send_notification BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  shipped_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ
);

CREATE TABLE order_shipment_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   UUID NOT NULL REFERENCES order_shipments(shipment_id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL,
  product_id    UUID REFERENCES skus(product_id),
  quantity      INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE order_activity (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  description TEXT,
  amount      NUMERIC(12,2),
  currency    VARCHAR(3),
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipping_methods (
  shipping_method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_name        TEXT NOT NULL,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- FITMENT CENTRES
-- =============================================================================

CREATE TABLE fitment_centres (
  fitment_centre_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- linked fitter account (auth.users)
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id           TEXT UNIQUE,
  centre_name          TEXT,
  business_name        TEXT,
  contact_name         TEXT,
  contact_phone        TEXT,
  email                TEXT,
  phone                TEXT,
  business_number      TEXT,
  latitude             NUMERIC(10,7),
  longitude            NUMERIC(10,7),
  opening_hours        JSONB,
  services_offered     TEXT[] DEFAULT '{}',
  approved_status      fitment_approved_status NOT NULL DEFAULT 'pending',
  is_active            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from orders to fitment_centres (deferred — fitment_centres now exists)
ALTER TABLE orders ADD CONSTRAINT fk_orders_fitment_centre
  FOREIGN KEY (fitment_centre_id) REFERENCES fitment_centres(fitment_centre_id) ON DELETE SET NULL;

-- Auto-generate partner_id: PRT-YYYY-NNN
CREATE OR REPLACE FUNCTION generate_partner_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.partner_id IS NULL THEN
    NEW.partner_id := 'PRT-' || TO_CHAR(NOW(), 'YYYY') || '-'
      || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_partner_id
  BEFORE INSERT ON fitment_centres
  FOR EACH ROW EXECUTE FUNCTION generate_partner_id();

-- fitment_jobs — nullable scheduled fields, single status column
CREATE TABLE fitment_jobs (
  job_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID REFERENCES orders(order_id) ON DELETE CASCADE,
  fitment_centre_id  UUID NOT NULL REFERENCES fitment_centres(fitment_centre_id) ON DELETE RESTRICT,
  customer_id        UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  task_number        TEXT UNIQUE,
  customer_name      TEXT,
  customer_phone     TEXT,
  scheduled_date     DATE,
  scheduled_time     TEXT,
  tyre_pattern       TEXT,
  tyre_size          TEXT,
  quantity           INTEGER NOT NULL DEFAULT 1,
  vehicle_model      TEXT,
  notes              TEXT,
  status             VARCHAR(30) NOT NULL DEFAULT 'new_request',
  -- new_request | accepted | completed | cancelled | delayed
  earnings_amount    NUMERIC(10,2),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.task_number IS NULL THEN
    NEW.task_number := 'TASK-' || TO_CHAR(NOW(), 'YYYY') || '-'
      || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_number
  BEFORE INSERT ON fitment_jobs
  FOR EACH ROW EXECUTE FUNCTION generate_task_number();

CREATE TABLE fitment_job_items (
  job_item_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES fitment_jobs(job_id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES skus(product_id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  service_type service_type DEFAULT 'supply_and_fit'
);

-- fitter pricing matrix
CREATE TABLE fitter_pricing (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fitment_centre_id UUID NOT NULL REFERENCES fitment_centres(fitment_centre_id) ON DELETE CASCADE,
  tyre_type         VARCHAR(20) NOT NULL,
  rim_range         VARCHAR(20) NOT NULL,
  per_tyre          NUMERIC(10,2),
  per_pair          NUMERIC(10,2),
  per_set_of_4      NUMERIC(10,2),
  callout_fee       NUMERIC(10,2),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fitment_centre_id, tyre_type, rim_range)
);

-- fitter earnings ledger
CREATE TABLE fitter_earnings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fitment_centre_id UUID NOT NULL REFERENCES fitment_centres(fitment_centre_id) ON DELETE CASCADE,
  job_id            UUID REFERENCES fitment_jobs(job_id),
  customer_name     TEXT,
  amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_date      DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fitter applications (public onboarding)
CREATE TABLE fitter_applications (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                 TEXT NOT NULL,
  email                     TEXT NOT NULL,
  contact_person            TEXT NOT NULL,
  contact_email             TEXT NOT NULL,
  address                   TEXT,
  mobile_number             TEXT,
  business_number           TEXT,
  fits_passenger_suv        BOOLEAN NOT NULL DEFAULT FALSE,
  fits_wheel_packages       BOOLEAN NOT NULL DEFAULT FALSE,
  fits_truck                BOOLEAN NOT NULL DEFAULT FALSE,
  wheel_alignment_available BOOLEAN NOT NULL DEFAULT FALSE,
  wheel_alignment_price     NUMERIC(10,2),
  mobile_fitting_available  BOOLEAN NOT NULL DEFAULT FALSE,
  working_hours             JSONB NOT NULL DEFAULT '[]',
  status                    VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_notes               TEXT,
  reviewed_by               UUID REFERENCES auth.users(id),
  reviewed_at               TIMESTAMPTZ,
  submitted_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fitment centre payouts
CREATE TABLE fitment_centre_payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fitment_centre_id   UUID NOT NULL REFERENCES fitment_centres(fitment_centre_id) ON DELETE CASCADE,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  order_count         INTEGER NOT NULL DEFAULT 0,
  gross_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustments         NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payout          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress','completed','failed')),
  payment_date        DATE,
  reference           TEXT,
  invoice_url         TEXT,
  settlement_schedule TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (settlement_schedule IN ('weekly','fortnightly','monthly')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fitment_centre_bank_details (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fitment_centre_id UUID NOT NULL UNIQUE REFERENCES fitment_centres(fitment_centre_id) ON DELETE CASCADE,
  account_holder    TEXT NOT NULL,
  bank_name         TEXT NOT NULL,
  bsb               TEXT,
  account_number    TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fitment_centre_compliance_docs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fitment_centre_id UUID NOT NULL REFERENCES fitment_centres(fitment_centre_id) ON DELETE CASCADE,
  policy_type       TEXT NOT NULL,
  provider          TEXT,
  policy_number     TEXT,
  expiry_date       DATE,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('valid','expired','pending','rejected')),
  doc_url           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- WHEELS & VEHICLES
-- =============================================================================

CREATE TABLE wheel_brands (
  wheel_brand_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name     TEXT NOT NULL,
  logo           TEXT,
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wheels (
  wheel_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_brand_id UUID NOT NULL REFERENCES wheel_brands(wheel_brand_id) ON DELETE RESTRICT,
  model_name     TEXT NOT NULL,
  model_slug     TEXT NOT NULL UNIQUE,
  description    TEXT,
  main_image     TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  style_category wheel_style_category,
  finish         TEXT,
  colour         TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wheel_variants (
  wheel_variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id         UUID NOT NULL REFERENCES wheels(wheel_id) ON DELETE RESTRICT,
  sku              TEXT NOT NULL UNIQUE,
  diameter         NUMERIC(5,2) NOT NULL,
  width            NUMERIC(5,2) NOT NULL,
  pcd              TEXT NOT NULL,
  "offset"         NUMERIC(6,2) NOT NULL,
  centre_bore      NUMERIC(6,2),
  load_rating      NUMERIC(8,2),
  price            NUMERIC(10,2),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make       TEXT NOT NULL,
  model      TEXT NOT NULL,
  year_from  INTEGER NOT NULL,
  year_to    INTEGER,
  series     TEXT,
  variant    TEXT,
  body_type  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicle_tyre_fitments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  front_size   TEXT NOT NULL,
  rear_size    TEXT,
  is_staggered BOOLEAN NOT NULL DEFAULT FALSE,
  notes        TEXT
);

CREATE TABLE vehicle_wheel_fitments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  diameter_range TEXT,
  width_range    TEXT,
  pcd            TEXT NOT NULL,
  offset_min     NUMERIC(6,2),
  offset_max     NUMERIC(6,2),
  centre_bore    NUMERIC(6,2),
  notes          TEXT
);

-- =============================================================================
-- PROMOTIONS & ANALYTICS
-- =============================================================================

CREATE TABLE promotions (
  promotion_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  discount_type  discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  applies_to     promotion_applies_to NOT NULL,
  target_id      UUID,
  minimum_qty    INTEGER DEFAULT 1,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE product_search_logs (
  log_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  search_term          TEXT NOT NULL,
  normalized_size_code TEXT,
  brand_filter         TEXT,
  category_filter      TEXT,
  results_count        INTEGER NOT NULL DEFAULT 0,
  clicked_product_id   UUID REFERENCES skus(product_id) ON DELETE SET NULL,
  converted_order_id   UUID REFERENCES orders(order_id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- -------------------------------------------------------------------------
-- SKUs — product catalogue
-- -------------------------------------------------------------------------

-- King composite: rim narrows 50k→~500, width+profile→~50, rest cost nothing
-- Column order: highest selectivity first
CREATE INDEX idx_sku_filter_composite ON skus
  (rim_size, width, profile, runflat, xl_reinforced, sidewall, construction_type)
  WHERE status = 'active';

CREATE INDEX idx_skus_normalized_size ON skus (normalized_size_code);
CREATE INDEX idx_skus_brand_pattern   ON skus (brand_id, pattern_id) WHERE status = 'active';
CREATE INDEX idx_skus_product_slug    ON skus (product_slug);
CREATE INDEX idx_skus_updated_at      ON skus (updated_at DESC);   -- Typesense sync delta queries
CREATE INDEX idx_skus_stock_alert     ON skus (total_available_stock) WHERE status = 'active'; -- low-stock admin

-- -------------------------------------------------------------------------
-- Brands & Patterns — fuzzy supplier matching
-- -------------------------------------------------------------------------
CREATE INDEX idx_brands_name_trgm    ON brands   USING GiST (brand_name   gist_trgm_ops);
CREATE INDEX idx_patterns_name_trgm  ON patterns USING GiST (pattern_name gist_trgm_ops);
CREATE INDEX idx_patterns_brand       ON patterns (brand_id);
CREATE INDEX idx_patterns_collection  ON patterns (collection_id);

-- -------------------------------------------------------------------------
-- Categories & product_categories / pattern_categories junction tables
-- -------------------------------------------------------------------------
CREATE INDEX idx_categories_parent       ON categories (parent_category_id);
CREATE INDEX idx_categories_type         ON categories (category_type) WHERE is_active = true;
CREATE INDEX idx_product_categories_prod ON product_categories (product_id);
CREATE INDEX idx_product_categories_cat  ON product_categories (category_id);
CREATE INDEX idx_pattern_categories_pat  ON pattern_categories (pattern_id);
CREATE INDEX idx_pattern_categories_cat  ON pattern_categories (category_id);

-- -------------------------------------------------------------------------
-- Stock
-- -------------------------------------------------------------------------
CREATE INDEX idx_product_stock_product   ON product_stock (product_id);
CREATE INDEX idx_product_stock_warehouse ON product_stock (warehouse_id);

-- -------------------------------------------------------------------------
-- Suppliers & supplier stock
-- -------------------------------------------------------------------------
CREATE INDEX idx_sps_product    ON supplier_product_stock (product_id);
CREATE INDEX idx_sps_supplier   ON supplier_product_stock (supplier_id);
CREATE INDEX idx_spm_supplier   ON supplier_product_map (supplier_id);
CREATE INDEX idx_spm_product    ON supplier_product_map (product_id);
CREATE INDEX idx_spm_verified   ON supplier_product_map (is_verified) WHERE is_verified = false; -- review queue

-- -------------------------------------------------------------------------
-- Purchase orders
-- -------------------------------------------------------------------------
CREATE INDEX idx_po_supplier    ON purchase_orders (supplier_id);
CREATE INDEX idx_po_status      ON purchase_orders (status);
CREATE INDEX idx_po_created_at  ON purchase_orders (created_at DESC);
CREATE INDEX idx_poi_order      ON purchase_order_items (po_id);
CREATE INDEX idx_poi_product    ON purchase_order_items (product_id);

-- -------------------------------------------------------------------------
-- Orders
-- -------------------------------------------------------------------------
CREATE INDEX idx_orders_customer_id        ON orders (customer_id);
CREATE INDEX idx_orders_created_at         ON orders (created_at DESC);
CREATE INDEX idx_orders_payment_status     ON orders (payment_status);
CREATE INDEX idx_orders_fulfillment_status ON orders (fulfillment_status);
CREATE INDEX idx_orders_delivery_method    ON orders (delivery_method);  -- admin filter by Home/Fitment

-- -------------------------------------------------------------------------
-- Order sub-tables
-- -------------------------------------------------------------------------
CREATE INDEX idx_order_items_order_id      ON order_items (order_id);
CREATE INDEX idx_order_items_product_id    ON order_items (product_id);
CREATE INDEX idx_order_payments_order_id   ON order_payments (order_id);
CREATE INDEX idx_order_shipments_order_id  ON order_shipments (order_id);
CREATE INDEX idx_osi_shipment_id           ON order_shipment_items (shipment_id);
CREATE INDEX idx_order_activity_order_id   ON order_activity (order_id, created_at DESC);

-- -------------------------------------------------------------------------
-- Customers & addresses
-- -------------------------------------------------------------------------
CREATE INDEX idx_customers_email   ON customers (email);
CREATE INDEX idx_customers_profile ON customers (profile_id);
CREATE INDEX idx_addresses_customer ON addresses (customer_id);

-- -------------------------------------------------------------------------
-- Customer groups
-- -------------------------------------------------------------------------
CREATE INDEX idx_cgm_group_id    ON customer_group_members (group_id);
CREATE INDEX idx_cgm_customer_id ON customer_group_members (customer_id);

-- -------------------------------------------------------------------------
-- Product prices
-- -------------------------------------------------------------------------
CREATE INDEX idx_product_prices_product ON product_prices (product_id);
CREATE INDEX idx_product_prices_group   ON product_prices (customer_group_id);

-- -------------------------------------------------------------------------
-- Promotions — active-range lookup for pricing engine
-- -------------------------------------------------------------------------
CREATE INDEX idx_promotions_active ON promotions (is_active, start_date, end_date)
  WHERE is_active = true;
CREATE INDEX idx_promotions_dates  ON promotions (start_date, end_date);

-- -------------------------------------------------------------------------
-- Fitment centres
-- -------------------------------------------------------------------------
CREATE INDEX idx_fitment_centres_user   ON fitment_centres (user_id);
CREATE INDEX idx_fitment_centres_status ON fitment_centres (approved_status);
CREATE INDEX idx_fitment_centres_active ON fitment_centres (is_active) WHERE is_active = true;

-- -------------------------------------------------------------------------
-- Fitment jobs
-- -------------------------------------------------------------------------
CREATE INDEX idx_fitment_jobs_centre    ON fitment_jobs (fitment_centre_id);
CREATE INDEX idx_fitment_jobs_status    ON fitment_jobs (fitment_centre_id, status);
CREATE INDEX idx_fitment_jobs_scheduled ON fitment_jobs (fitment_centre_id, scheduled_date);
CREATE INDEX idx_fitment_jobs_order     ON fitment_jobs (order_id);
CREATE INDEX idx_fitment_job_items_job  ON fitment_job_items (job_id);

-- -------------------------------------------------------------------------
-- Fitter financials & compliance
-- -------------------------------------------------------------------------
CREATE INDEX idx_fitter_earnings_centre  ON fitter_earnings (fitment_centre_id);
CREATE INDEX idx_fitter_pricing_centre   ON fitter_pricing (fitment_centre_id);
CREATE INDEX idx_payouts_centre          ON fitment_centre_payouts (fitment_centre_id, created_at DESC);
CREATE INDEX idx_compliance_centre       ON fitment_centre_compliance_docs (fitment_centre_id);
CREATE INDEX idx_bank_details_centre     ON fitment_centre_bank_details (fitment_centre_id);

-- -------------------------------------------------------------------------
-- Fitter applications
-- -------------------------------------------------------------------------
CREATE INDEX idx_fitter_apps_status    ON fitter_applications (status);
CREATE INDEX idx_fitter_apps_submitted ON fitter_applications (submitted_at DESC);

-- -------------------------------------------------------------------------
-- Wheels & vehicles
-- -------------------------------------------------------------------------
CREATE INDEX idx_wheels_brand        ON wheels (wheel_brand_id);
CREATE INDEX idx_wheel_variants_wheel ON wheel_variants (wheel_id);
CREATE INDEX idx_vehicles_make_model ON vehicles (make, model, year_from, year_to); -- fitment lookup
CREATE INDEX idx_vtf_vehicle         ON vehicle_tyre_fitments (vehicle_id);
CREATE INDEX idx_vwf_vehicle         ON vehicle_wheel_fitments (vehicle_id);

-- -------------------------------------------------------------------------
-- Analytics
-- -------------------------------------------------------------------------
CREATE INDEX idx_search_logs_product    ON product_search_logs (clicked_product_id);
CREATE INDEX idx_search_logs_created_at ON product_search_logs (created_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-generate order_number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := LPAD(
      (EXTRACT(EPOCH FROM now())::BIGINT % 100000 + FLOOR(RANDOM() * 10000)::BIGINT)::TEXT,
      5, '0'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Denormalized total_available_stock on skus (updated by trigger on product_stock)
CREATE OR REPLACE FUNCTION sync_total_available_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE skus
  SET total_available_stock = (
    SELECT COALESCE(SUM(available_stock), 0)
    FROM product_stock
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_stock
  AFTER INSERT OR UPDATE OR DELETE ON product_stock
  FOR EACH ROW EXECUTE FUNCTION sync_total_available_stock();

-- customer_group_members count
CREATE OR REPLACE FUNCTION update_group_customer_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customer_groups SET customer_count = customer_count + 1 WHERE group_id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customer_groups SET customer_count = GREATEST(customer_count - 1, 0) WHERE group_id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_cgm_count
  AFTER INSERT OR DELETE ON customer_group_members
  FOR EACH ROW EXECUTE FUNCTION update_group_customer_count();

-- Auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-create fitter_earnings record when job completed
CREATE OR REPLACE FUNCTION create_earnings_on_job_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    INSERT INTO fitter_earnings (fitment_centre_id, job_id, customer_name, amount, status)
    VALUES (NEW.fitment_centre_id, NEW.job_id, NEW.customer_name,
            COALESCE(NEW.earnings_amount, 0), 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_earnings_on_complete
  AFTER UPDATE ON fitment_jobs
  FOR EACH ROW EXECUTE FUNCTION create_earnings_on_job_complete();

-- updated_at triggers
CREATE TRIGGER trg_brands_updated_at         BEFORE UPDATE ON brands            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patterns_updated_at       BEFORE UPDATE ON patterns          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_skus_updated_at           BEFORE UPDATE ON skus              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_collections_updated_at    BEFORE UPDATE ON collections       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_stock_updated_at  BEFORE UPDATE ON product_stock     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_prices_updated_at BEFORE UPDATE ON product_prices    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at       BEFORE UPDATE ON profiles          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated_at      BEFORE UPDATE ON customers         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_fitment_centres_updated_at BEFORE UPDATE ON fitment_centres  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_fitment_jobs_updated_at   BEFORE UPDATE ON fitment_jobs      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated_at         BEFORE UPDATE ON orders            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payouts_updated_at        BEFORE UPDATE ON fitment_centre_payouts      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bank_details_updated_at   BEFORE UPDATE ON fitment_centre_bank_details FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_compliance_updated_at     BEFORE UPDATE ON fitment_centre_compliance_docs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- increment_fulfilled_quantity RPC (used by fulfillment service)
CREATE OR REPLACE FUNCTION increment_fulfilled_quantity(p_order_item_id UUID, p_quantity INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE order_items
  SET fulfilled_quantity = fulfilled_quantity + p_quantity
  WHERE order_item_id = p_order_item_id;
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE brands                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_groups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_group_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_shipments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_shipment_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_activity                ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitment_centres               ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitment_jobs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitter_pricing                ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitter_earnings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitter_applications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitment_centre_payouts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitment_centre_bank_details   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitment_centre_compliance_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions                    ENABLE ROW LEVEL SECURITY;

-- Public read: active products
CREATE POLICY "public_read_brands"       ON brands      FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_patterns"     ON patterns    FOR SELECT USING (is_active = TRUE AND show_on_website = TRUE);
CREATE POLICY "public_read_skus"         ON skus        FOR SELECT USING (status = 'active');
CREATE POLICY "public_read_categories"   ON categories  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_collections"  ON collections FOR SELECT USING (is_active = TRUE);

-- Customers: own data only
CREATE POLICY "customers_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "customers_own_record" ON customers
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "customers_own_addresses" ON addresses
  FOR ALL USING (
    customer_id IN (SELECT customer_id FROM customers WHERE profile_id = auth.uid())
  );

CREATE POLICY "customers_own_orders" ON orders
  FOR SELECT USING (
    customer_id IN (SELECT customer_id FROM customers WHERE profile_id = auth.uid())
  );

CREATE POLICY "customers_own_group_memberships" ON customer_group_members
  FOR SELECT USING (
    customer_id IN (SELECT customer_id FROM customers WHERE profile_id = auth.uid())
  );

CREATE POLICY "customer_own_order_activity" ON order_activity
  FOR SELECT USING (
    order_id IN (
      SELECT o.order_id FROM orders o
      JOIN customers c ON c.customer_id = o.customer_id
      WHERE c.profile_id = auth.uid()
    )
  );

-- Fitters: own centre data only
CREATE POLICY "fitters_own_jobs" ON fitment_jobs
  FOR ALL USING (
    fitment_centre_id IN (SELECT fitment_centre_id FROM fitment_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "fitters_own_pricing" ON fitter_pricing
  FOR ALL USING (
    fitment_centre_id IN (SELECT fitment_centre_id FROM fitment_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "fitters_own_earnings" ON fitter_earnings
  FOR SELECT USING (
    fitment_centre_id IN (SELECT fitment_centre_id FROM fitment_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "fitters_read_own_payouts" ON fitment_centre_payouts
  FOR SELECT USING (
    fitment_centre_id IN (SELECT fitment_centre_id FROM fitment_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "fitters_read_own_bank_details" ON fitment_centre_bank_details
  FOR SELECT USING (
    fitment_centre_id IN (SELECT fitment_centres.fitment_centre_id FROM fitment_centres WHERE user_id = auth.uid())
  );

CREATE POLICY "fitters_read_own_compliance" ON fitment_centre_compliance_docs
  FOR SELECT USING (
    fitment_centre_id IN (SELECT fitment_centre_id FROM fitment_centres WHERE user_id = auth.uid())
  );

-- Public: insert fitter application (no auth)
CREATE POLICY "public_insert_application" ON fitter_applications
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "admin_all_fitter_applications" ON fitter_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Admin: all order sub-tables (backend uses service role key — bypasses RLS entirely)
-- These policies are for any future direct Supabase client calls with user JWT
CREATE POLICY "admin_all_order_payments"  ON order_payments     FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "admin_all_order_shipments" ON order_shipments    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "admin_all_shipment_items"  ON order_shipment_items FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "admin_all_order_activity"  ON order_activity     FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "admin_all_pricing"         ON fitter_pricing     FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "admin_all_earnings"        ON fitter_earnings    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
