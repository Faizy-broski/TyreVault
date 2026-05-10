-- =============================================================================
-- INDEXES
-- Added as a separate migration since initial_schema was already applied.
-- =============================================================================

-- -------------------------------------------------------------------------
-- SKUs
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sku_filter_composite ON skus
  (rim_size, width, profile, runflat, xl_reinforced, sidewall, construction_type)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_skus_normalized_size ON skus (normalized_size_code);
CREATE INDEX IF NOT EXISTS idx_skus_brand_pattern   ON skus (brand_id, pattern_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_skus_product_slug    ON skus (product_slug);
CREATE INDEX IF NOT EXISTS idx_skus_updated_at      ON skus (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_skus_stock_alert     ON skus (total_available_stock) WHERE status = 'active';

-- -------------------------------------------------------------------------
-- Brands & Patterns
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_brands_name_trgm   ON brands   USING GiST (brand_name   gist_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patterns_name_trgm ON patterns USING GiST (pattern_name gist_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patterns_brand      ON patterns (brand_id);
CREATE INDEX IF NOT EXISTS idx_patterns_collection ON patterns (collection_id);

-- -------------------------------------------------------------------------
-- Categories & junction tables
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_categories_parent       ON categories (parent_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_type         ON categories (category_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_categories_prod ON product_categories (product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_cat  ON product_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_pattern_categories_pat  ON pattern_categories (pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_categories_cat  ON pattern_categories (category_id);

-- -------------------------------------------------------------------------
-- Stock
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_product_stock_product   ON product_stock (product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_warehouse ON product_stock (warehouse_id);

-- -------------------------------------------------------------------------
-- Suppliers
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sps_product  ON supplier_product_stock (product_id);
CREATE INDEX IF NOT EXISTS idx_sps_supplier ON supplier_product_stock (supplier_id);
CREATE INDEX IF NOT EXISTS idx_spm_supplier ON supplier_product_map (supplier_id);
CREATE INDEX IF NOT EXISTS idx_spm_product  ON supplier_product_map (product_id);
CREATE INDEX IF NOT EXISTS idx_spm_verified ON supplier_product_map (is_verified) WHERE is_verified = false;

-- -------------------------------------------------------------------------
-- Purchase orders
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_po_supplier   ON purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status     ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_po_created_at ON purchase_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poi_order     ON purchase_order_items (po_id);
CREATE INDEX IF NOT EXISTS idx_poi_product   ON purchase_order_items (product_id);

-- -------------------------------------------------------------------------
-- Orders
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_customer_id        ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at         ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status     ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_method    ON orders (delivery_method);

-- -------------------------------------------------------------------------
-- Order sub-tables
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_order_items_order_id     ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id   ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id  ON order_payments (order_id);
CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id ON order_shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_osi_shipment_id          ON order_shipment_items (shipment_id);
CREATE INDEX IF NOT EXISTS idx_order_activity_order_id  ON order_activity (order_id, created_at DESC);

-- -------------------------------------------------------------------------
-- Customers
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_email    ON customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_profile  ON customers (profile_id);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses (customer_id);

-- -------------------------------------------------------------------------
-- Customer groups
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cgm_group_id    ON customer_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_cgm_customer_id ON customer_group_members (customer_id);

-- -------------------------------------------------------------------------
-- Product prices
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices (product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_group   ON product_prices (customer_group_id);

-- -------------------------------------------------------------------------
-- Promotions
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions (is_active, start_date, end_date)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions (start_date, end_date);

-- -------------------------------------------------------------------------
-- Fitment centres
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fitment_centres_user   ON fitment_centres (user_id);
CREATE INDEX IF NOT EXISTS idx_fitment_centres_status ON fitment_centres (approved_status);
CREATE INDEX IF NOT EXISTS idx_fitment_centres_active ON fitment_centres (is_active) WHERE is_active = true;

-- -------------------------------------------------------------------------
-- Fitment jobs
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fitment_jobs_centre    ON fitment_jobs (fitment_centre_id);
CREATE INDEX IF NOT EXISTS idx_fitment_jobs_status    ON fitment_jobs (fitment_centre_id, status);
CREATE INDEX IF NOT EXISTS idx_fitment_jobs_scheduled ON fitment_jobs (fitment_centre_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_fitment_jobs_order     ON fitment_jobs (order_id);
CREATE INDEX IF NOT EXISTS idx_fitment_job_items_job  ON fitment_job_items (job_id);

-- -------------------------------------------------------------------------
-- Fitter financials & compliance
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fitter_earnings_centre ON fitter_earnings (fitment_centre_id);
CREATE INDEX IF NOT EXISTS idx_fitter_pricing_centre  ON fitter_pricing (fitment_centre_id);
CREATE INDEX IF NOT EXISTS idx_payouts_centre         ON fitment_centre_payouts (fitment_centre_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_centre      ON fitment_centre_compliance_docs (fitment_centre_id);
CREATE INDEX IF NOT EXISTS idx_bank_details_centre    ON fitment_centre_bank_details (fitment_centre_id);

-- -------------------------------------------------------------------------
-- Fitter applications
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fitter_apps_status    ON fitter_applications (status);
CREATE INDEX IF NOT EXISTS idx_fitter_apps_submitted ON fitter_applications (submitted_at DESC);

-- -------------------------------------------------------------------------
-- Wheels & vehicles
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wheels_brand          ON wheels (wheel_brand_id);
CREATE INDEX IF NOT EXISTS idx_wheel_variants_wheel  ON wheel_variants (wheel_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model   ON vehicles (make, model, year_from, year_to);
CREATE INDEX IF NOT EXISTS idx_vtf_vehicle           ON vehicle_tyre_fitments (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vwf_vehicle           ON vehicle_wheel_fitments (vehicle_id);

-- -------------------------------------------------------------------------
-- Analytics
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_search_logs_product    ON product_search_logs (clicked_product_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON product_search_logs (created_at DESC);
