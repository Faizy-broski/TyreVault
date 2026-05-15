-- =============================================================================
-- Onyx Tyres — Spec Compliance Migration
-- Closes every gap between the live schema and the Developer Specification.
-- Safe to run on an existing database — all statements use IF NOT EXISTS,
-- RENAME guards, and backfills before applying NOT NULL constraints.
-- Run ONCE in Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1 — CREATE ALL MISSING ENUMS
-- =============================================================================

DO $$ BEGIN CREATE TYPE customer_type        AS ENUM ('retail','wholesale','fleet','trade');             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE account_status       AS ENUM ('active','paused','blocked');                      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE address_owner_type   AS ENUM ('customer','warehouse','supplier','fitter');        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_type           AS ENUM ('delivery','fitment_centre','pickup','mobile_fitting'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status         AS ENUM ('pending','paid','processing','fulfilled','cancelled','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status       AS ENUM ('unpaid','paid','partially_paid','refunded');       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE fulfilment_type      AS ENUM ('own_stock','supplier_stock','split','special_order'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_product_type   AS ENUM ('tyre','wheel','service');                          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE fulfilment_source    AS ENUM ('own_stock','supplier_stock','3pl_stock','incoming_stock'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE shipping_method_type AS ENUM ('own_fleet','courier_api','3pl','supplier_direct','pickup'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE job_status           AS ENUM ('pending','assigned','accepted','rejected','in_progress','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE shipment_status      AS ENUM ('planned','shipped','arrived','received','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- SECTION 2 — product_stock: add missing stock-type columns
-- Spec requires: incoming_stock, in_transit_stock, damaged_stock,
--                minimum_stock_level, last_stock_update
-- =============================================================================

ALTER TABLE product_stock
  ADD COLUMN IF NOT EXISTS incoming_stock      INTEGER NOT NULL DEFAULT 0 CHECK (incoming_stock      >= 0),
  ADD COLUMN IF NOT EXISTS in_transit_stock    INTEGER NOT NULL DEFAULT 0 CHECK (in_transit_stock    >= 0),
  ADD COLUMN IF NOT EXISTS damaged_stock       INTEGER NOT NULL DEFAULT 0 CHECK (damaged_stock       >= 0),
  ADD COLUMN IF NOT EXISTS minimum_stock_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_update   TIMESTAMPTZ NOT NULL DEFAULT now();


-- =============================================================================
-- SECTION 3 — suppliers: add missing fields
-- Spec requires: state, payment_terms, stock_access_type, api_connected
-- =============================================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS state             TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms     TEXT,
  ADD COLUMN IF NOT EXISTS stock_access_type stock_access_type,
  ADD COLUMN IF NOT EXISTS api_connected     BOOLEAN NOT NULL DEFAULT FALSE;


-- =============================================================================
-- SECTION 4 — purchase_orders: rename columns + add all financial fields
-- =============================================================================

-- Rename 'status' → 'po_status' (spec column name)
DO $$ BEGIN
  ALTER TABLE purchase_orders RENAME COLUMN status TO po_status;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Rename 'expected_date' → 'eta_date' (spec field name)
DO $$ BEGIN
  ALTER TABLE purchase_orders RENAME COLUMN expected_date TO eta_date;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Add all missing financial/logistics fields
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS po_number      TEXT,
  ADD COLUMN IF NOT EXISTS order_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS shipment_date  DATE,
  ADD COLUMN IF NOT EXISTS currency       TEXT NOT NULL DEFAULT 'AUD',
  ADD COLUMN IF NOT EXISTS exchange_rate  NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS freight_cost   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS clearance_cost NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_cost     NUMERIC(14,2);

-- Backfill po_number for existing rows
WITH ordered AS (
  SELECT po_id,
    'PO-' || TO_CHAR(created_at, 'YYYY') || '-'
      || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::TEXT, 4, '0') AS gen_num
  FROM purchase_orders
  WHERE po_number IS NULL
)
UPDATE purchase_orders p
SET    po_number = o.gen_num
FROM   ordered o
WHERE  p.po_id = o.po_id;

ALTER TABLE purchase_orders ALTER COLUMN po_number SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE purchase_orders ADD CONSTRAINT uq_po_number UNIQUE (po_number);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rebuild status index under new column name
DROP INDEX IF EXISTS idx_po_status;
CREATE INDEX IF NOT EXISTS idx_po_po_status ON purchase_orders (po_status);
CREATE INDEX IF NOT EXISTS idx_po_po_number ON purchase_orders (po_number);


-- =============================================================================
-- SECTION 5 — purchase_order_items: rename + add missing fields
-- =============================================================================

-- Rename 'quantity' → 'quantity_ordered'
DO $$ BEGIN
  ALTER TABLE purchase_order_items RENAME COLUMN quantity TO quantity_ordered;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS quantity_received    INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  ADD COLUMN IF NOT EXISTS landed_cost_per_unit NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cbm_per_unit         NUMERIC(8,4);


-- =============================================================================
-- SECTION 6 — CREATE shipments TABLE
-- Tracks inbound containers / purchase-order freight.
-- Different from order_shipments (outbound customer fulfilment).
-- =============================================================================

CREATE TABLE IF NOT EXISTS shipments (
  shipment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id             UUID REFERENCES purchase_orders(po_id) ON DELETE SET NULL,
  container_number  TEXT,
  vessel_name       TEXT,
  booking_reference TEXT,
  etd               DATE,
  eta               DATE,
  arrival_date      DATE,
  clearance_status  clearance_status,
  warehouse_id      UUID NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
  shipment_status   shipment_status NOT NULL DEFAULT 'planned',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_shipments" ON shipments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE OR REPLACE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_shipments_po_id     ON shipments (po_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status    ON shipments (shipment_status);
CREATE INDEX IF NOT EXISTS idx_shipments_eta       ON shipments (eta);
CREATE INDEX IF NOT EXISTS idx_shipments_warehouse ON shipments (warehouse_id);


-- =============================================================================
-- SECTION 7 — addresses: polymorphic redesign + spec field name aliases
-- Current design is customer-scoped only.
-- Spec requires: owner_type, owner_id, latitude, longitude, is_default,
--                plus spec column names (address_line_1, suburb, postcode).
-- Old columns (customer_id, address_line1, city, postal_code) are kept
-- for backward compat — backend can migrate to new names progressively.
-- =============================================================================

-- Allow non-customer entities to have addresses
ALTER TABLE addresses ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE addresses
  -- Polymorphic owner
  ADD COLUMN IF NOT EXISTS owner_type     address_owner_type,
  ADD COLUMN IF NOT EXISTS owner_id       UUID,
  -- Spec-named column aliases (backfilled below)
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS suburb         TEXT,
  ADD COLUMN IF NOT EXISTS postcode       TEXT,
  -- Distance/proximity fields
  ADD COLUMN IF NOT EXISTS latitude       NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude      NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS is_default     BOOLEAN DEFAULT FALSE;

-- Backfill polymorphic + spec columns from existing customer addresses
UPDATE addresses
SET
  owner_type      = 'customer'::address_owner_type,
  owner_id        = customer_id,
  address_line_1  = address_line1,
  address_line_2  = address_line2,
  suburb          = city,
  postcode        = postal_code
WHERE owner_type IS NULL AND customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_addresses_owner     ON addresses (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_addresses_postcode  ON addresses (postcode);


-- =============================================================================
-- SECTION 8 — customers: rename company + add missing spec fields
-- =============================================================================

-- Rename 'company' → 'business_name'
DO $$ BEGIN
  ALTER TABLE customers RENAME COLUMN company TO business_name;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_type      customer_type  NOT NULL DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS billing_address_id UUID REFERENCES addresses(address_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_status     account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS credit_limit       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS payment_terms      TEXT;


-- =============================================================================
-- SECTION 9 — orders: add missing spec columns
-- Old columns (delivery_method, fulfillment_status, shipping_amount, tax_amount)
-- are KEPT for backward compat. New spec columns are added alongside them.
-- Backfills map old values to new enum values.
-- =============================================================================

ALTER TABLE orders
  -- Spec enum columns (alongside existing VARCHARs)
  ADD COLUMN IF NOT EXISTS order_type          order_type,
  ADD COLUMN IF NOT EXISTS order_status        order_status   NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfilment_type     fulfilment_type NOT NULL DEFAULT 'own_stock',
  -- Spec FK columns
  ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES addresses(address_id),
  ADD COLUMN IF NOT EXISTS warehouse_id        UUID REFERENCES warehouses(warehouse_id),
  -- Spec financial columns (alongside existing shipping_amount / tax_amount)
  ADD COLUMN IF NOT EXISTS shipping_cost       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fitting_cost        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount          NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Backfill order_type from delivery_method
UPDATE orders
SET order_type = CASE delivery_method
  WHEN 'home_delivery'  THEN 'delivery'::order_type
  WHEN 'fitment_centre' THEN 'fitment_centre'::order_type
  WHEN 'pickup'         THEN 'pickup'::order_type
  WHEN 'mobile_fitting' THEN 'mobile_fitting'::order_type
  ELSE                       'delivery'::order_type
END
WHERE order_type IS NULL;

-- Backfill spec financial columns from existing renamed columns
UPDATE orders SET gst_amount    = COALESCE(tax_amount,     0) WHERE gst_amount    = 0;
UPDATE orders SET shipping_cost = COALESCE(shipping_amount, 0) WHERE shipping_cost = 0;

CREATE INDEX IF NOT EXISTS idx_orders_order_type   ON orders (order_type);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders (order_status);


-- =============================================================================
-- SECTION 10 — order_items: add fulfillment routing fields
-- Spec requires each line item to know its stock source and product type.
-- =============================================================================

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_type      order_product_type NOT NULL DEFAULT 'tyre',
  ADD COLUMN IF NOT EXISTS warehouse_id      UUID REFERENCES warehouses(warehouse_id),
  ADD COLUMN IF NOT EXISTS supplier_id       UUID REFERENCES suppliers(supplier_id),
  ADD COLUMN IF NOT EXISTS fulfilment_source fulfilment_source  NOT NULL DEFAULT 'own_stock',
  ADD COLUMN IF NOT EXISTS reserved_qty      INTEGER DEFAULT 0;


-- =============================================================================
-- SECTION 11 — shipping_methods: add missing spec fields
-- =============================================================================

ALTER TABLE shipping_methods
  ADD COLUMN IF NOT EXISTS method_type  shipping_method_type,
  ADD COLUMN IF NOT EXISTS api_provider TEXT;


-- =============================================================================
-- SECTION 12 — CREATE shipping_quotes TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS shipping_quotes (
  quote_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID REFERENCES orders(order_id) ON DELETE SET NULL,
  warehouse_id            UUID NOT NULL REFERENCES warehouses(warehouse_id),
  destination_postcode    TEXT NOT NULL,
  shipping_method_id      UUID NOT NULL REFERENCES shipping_methods(shipping_method_id),
  courier_name            TEXT,
  freight_cost            NUMERIC(10,2) NOT NULL,
  customer_charge         NUMERIC(10,2) NOT NULL,
  estimated_delivery_days INTEGER,
  api_response            JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shipping_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_shipping_quotes" ON shipping_quotes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE INDEX IF NOT EXISTS idx_shipping_quotes_order     ON shipping_quotes (order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_warehouse ON shipping_quotes (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_postcode  ON shipping_quotes (destination_postcode);


-- =============================================================================
-- SECTION 13 — fitment_centres: add missing spec fields
-- =============================================================================

ALTER TABLE fitment_centres
  ADD COLUMN IF NOT EXISTS address_id               UUID REFERENCES addresses(address_id),
  ADD COLUMN IF NOT EXISTS fitting_price            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS wheel_alignment_price    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS mobile_fitting_available BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preferred_partner        BOOLEAN NOT NULL DEFAULT FALSE;

-- Location search (distance-based fitter lookup)
CREATE INDEX IF NOT EXISTS idx_fitment_centres_location
  ON fitment_centres (latitude, longitude)
  WHERE is_active = TRUE AND approved_status = 'approved';


-- =============================================================================
-- SECTION 14 — fitment_jobs: add spec fields + proper job_status enum column
--
-- Strategy: Add 'job_status' (enum) column alongside existing 'status' (VARCHAR).
-- Backfill enum column from VARCHAR values.
-- Create a sync trigger so both columns stay consistent going forward.
-- Once backend code is updated to use job_status, the old status column can
-- be dropped in a future migration.
-- =============================================================================

ALTER TABLE fitment_jobs
  ADD COLUMN IF NOT EXISTS job_status           job_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS assigned_by_admin_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS accepted_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fitter_notes         TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes          TEXT;

-- Map old VARCHAR values → new enum values
UPDATE fitment_jobs
SET job_status = CASE status
  WHEN 'new_request' THEN 'pending'::job_status
  WHEN 'accepted'    THEN 'accepted'::job_status
  WHEN 'completed'   THEN 'completed'::job_status
  WHEN 'cancelled'   THEN 'cancelled'::job_status
  WHEN 'delayed'     THEN 'in_progress'::job_status
  ELSE                    'pending'::job_status
END;

-- Backfill timestamps from updated_at for completed/accepted jobs
UPDATE fitment_jobs
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;

UPDATE fitment_jobs
SET accepted_at = updated_at
WHERE status IN ('accepted','completed') AND accepted_at IS NULL;

-- Sync trigger: when job_status (enum) changes, mirror to legacy status (VARCHAR)
-- and auto-set accepted_at / completed_at timestamps.
CREATE OR REPLACE FUNCTION sync_job_status_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.job_status IS DISTINCT FROM OLD.job_status THEN
    NEW.status := CASE NEW.job_status
      WHEN 'pending'     THEN 'new_request'
      WHEN 'assigned'    THEN 'new_request'
      WHEN 'accepted'    THEN 'accepted'
      WHEN 'rejected'    THEN 'cancelled'
      WHEN 'in_progress' THEN 'delayed'
      WHEN 'completed'   THEN 'completed'
      WHEN 'cancelled'   THEN 'cancelled'
      ELSE                    'new_request'
    END;
    IF NEW.job_status = 'accepted'  AND (OLD.job_status IS NULL OR OLD.job_status != 'accepted')  THEN NEW.accepted_at  := now(); END IF;
    IF NEW.job_status = 'completed' AND (OLD.job_status IS NULL OR OLD.job_status != 'completed') THEN NEW.completed_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_job_status ON fitment_jobs;
CREATE TRIGGER trg_sync_job_status
  BEFORE UPDATE ON fitment_jobs
  FOR EACH ROW EXECUTE FUNCTION sync_job_status_columns();

-- Spec-compliant composite index on enum column
CREATE INDEX IF NOT EXISTS idx_fitment_jobs_job_status
  ON fitment_jobs (fitment_centre_id, scheduled_date, job_status);


-- =============================================================================
-- SECTION 15 — supplier_product_stock: rename columns to match spec
-- =============================================================================

DO $$ BEGIN
  ALTER TABLE supplier_product_stock RENAME COLUMN available_qty   TO available_stock;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE supplier_product_stock RENAME COLUMN price           TO supplier_price;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE supplier_product_stock RENAME COLUMN last_synced_at  TO stock_last_updated;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

ALTER TABLE supplier_product_stock
  ADD COLUMN IF NOT EXISTS freight_rule_id UUID;


-- =============================================================================
-- SECTION 16 — ADD ALL MISSING INDEXES (spec section 35 requirements)
-- =============================================================================

-- Spec: wheel_variants must be indexed by pcd, diameter, width, offset, centre_bore
CREATE INDEX IF NOT EXISTS idx_wheel_variants_fitment
  ON wheel_variants (pcd, diameter, width, "offset", centre_bore);

-- Spec: product_search_logs must be indexed by normalized_size_code and created_at
CREATE INDEX IF NOT EXISTS idx_search_logs_size
  ON product_search_logs (normalized_size_code, created_at DESC);


-- =============================================================================
-- SECTION 17 — COLUMN RENAME REFERENCE
-- The following columns were renamed in this migration. Update backend code
-- that references the old names before deploying to production.
--
-- TABLE                    OLD NAME            NEW NAME
-- purchase_orders          status              po_status
-- purchase_orders          expected_date       eta_date
-- purchase_order_items     quantity            quantity_ordered
-- supplier_product_stock   available_qty       available_stock
-- supplier_product_stock   price               supplier_price
-- supplier_product_stock   last_synced_at      stock_last_updated
-- customers                company             business_name
--
-- The following columns exist in BOTH old and new form (safe transition):
-- orders.delivery_method   →  orders.order_type       (new enum column added)
-- orders.fulfillment_status →  orders.order_status    (new enum column added)
-- orders.tax_amount        →  orders.gst_amount       (new column, backfilled)
-- orders.shipping_amount   →  orders.shipping_cost    (new column, backfilled)
-- fitment_jobs.status      →  fitment_jobs.job_status (new enum column + sync trigger)
-- addresses.address_line1  →  addresses.address_line_1 (new column, backfilled)
-- addresses.city           →  addresses.suburb         (new column, backfilled)
-- addresses.postal_code    →  addresses.postcode       (new column, backfilled)
-- =============================================================================

COMMIT;
