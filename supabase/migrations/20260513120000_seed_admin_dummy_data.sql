-- =============================================================================
-- Admin dummy data seed
-- Mirrors frontend/src/dummydata/admin/* into Supabase tables.
-- The frontend dummy files remain the source of truth for the sample payloads;
-- this migration only persists equivalent admin-side seed data in Supabase.
--
-- Notes:
-- - IDs are generated deterministically from the logical dummy identifiers so
--   the migration is safe to re-run.
-- - Some admin dummy files are not perfectly self-consistent. Two small support
--   rows are added so the relational seed remains valid:
--   1. A job-only customer for Olivia Brown (referenced by fitment-centre jobs)
--   2. Two hidden product patterns used only by order sample SKUs
-- - Existing auth users are linked when emails already exist, but this migration
--   does not create auth accounts or passwords.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Match any pre-existing auth users so seeded customer / fitter rows can
-- attach to real profiles without requiring auth.users inserts here.
-- ---------------------------------------------------------------------------
WITH matched_users AS (
  SELECT
    id,
    email,
    CASE
      WHEN email IN (
        'brisbane@onyxshield.com.au',
        'sydneynorth@onyxshield.com.au',
        'melbourne@onyxshield.com.au',
        'perth@onyxshield.com.au',
        'admin@fastfitadelaide.com.au',
        'service@premiertyrecentre.com.au',
        'contact@quickfitgc.com.au',
        'info@tyreprocbr.com.au'
      )
      THEN 'fitter'::user_role
      ELSE 'customer'::user_role
    END AS role
  FROM auth.users
  WHERE email IN (
    'shagun@example.com',
    'ali.khan@example.com',
    'david.lee@example.com',
    'priya.sharma@example.com',
    'james.walker@example.com',
    'emma.wilson@example.com',
    'liam.chen@example.com',
    'nadia.hassan@example.com',
    'ryan.murphy@example.com',
    'sophie.martin@example.com',
    'brisbane@onyxshield.com.au',
    'sydneynorth@onyxshield.com.au',
    'melbourne@onyxshield.com.au',
    'perth@onyxshield.com.au',
    'admin@fastfitadelaide.com.au',
    'service@premiertyrecentre.com.au',
    'contact@quickfitgc.com.au',
    'info@tyreprocbr.com.au'
  )
)
INSERT INTO profiles (id, role, created_at, updated_at)
SELECT id, role, now(), now()
FROM matched_users
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Customer groups needed by admin dummy pricing / grouping samples.
-- ---------------------------------------------------------------------------
INSERT INTO customer_groups (
  group_id,
  group_name,
  default_discount,
  can_view_wholesale,
  is_active,
  customer_count,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/customer-group/vip'),
  'VIP',
  0,
  TRUE,
  TRUE,
  0,
  '2024-06-01T00:00:00Z'::timestamptz,
  '2026-04-10T00:00:00Z'::timestamptz
WHERE NOT EXISTS (
  SELECT 1 FROM customer_groups WHERE group_name = 'VIP'
);

INSERT INTO customer_groups (
  group_id,
  group_name,
  default_discount,
  can_view_wholesale,
  is_active,
  customer_count,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/customer-group/vip-dealers'),
  'VIP Dealers',
  0,
  TRUE,
  TRUE,
  0,
  '2025-01-01T00:00:00Z'::timestamptz,
  '2026-05-12T00:00:00Z'::timestamptz
WHERE NOT EXISTS (
  SELECT 1 FROM customer_groups WHERE group_name = 'VIP Dealers'
);

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
WITH seed (
  brand_slug,
  brand_name,
  country_of_brand,
  manufacturer_name,
  brand_positioning,
  created_at,
  updated_at
) AS (
  VALUES
    ('michelin',     'Michelin',     'France',  'Michelin',     'premium'::brand_positioning_type, '2025-12-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('pirelli',      'Pirelli',      'Italy',   'Pirelli',      'premium'::brand_positioning_type, '2025-12-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('bridgestone',  'Bridgestone',  'Japan',   'Bridgestone',  'premium'::brand_positioning_type, '2025-12-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('goodyear',     'Goodyear',     'USA',     'Goodyear',     'premium'::brand_positioning_type, '2025-12-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('hankook',      'Hankook',      'Korea',   'Hankook',      'mid_range'::brand_positioning_type, '2025-12-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('continental',  'Continental',  'Germany', 'Continental',  'premium'::brand_positioning_type, '2025-12-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz)
)
INSERT INTO brands (
  brand_id,
  brand_name,
  brand_slug,
  country_of_brand,
  manufacturer_name,
  brand_positioning,
  is_active,
  show_on_website,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/brand/' || brand_slug),
  brand_name,
  brand_slug,
  country_of_brand,
  manufacturer_name,
  brand_positioning,
  TRUE,
  TRUE,
  created_at,
  updated_at
FROM seed
ON CONFLICT (brand_id) DO UPDATE
SET brand_name        = EXCLUDED.brand_name,
    country_of_brand  = EXCLUDED.country_of_brand,
    manufacturer_name = EXCLUDED.manufacturer_name,
    brand_positioning = EXCLUDED.brand_positioning,
    is_active         = EXCLUDED.is_active,
    show_on_website   = EXCLUDED.show_on_website,
    updated_at        = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Collections used by admin product dummies
-- ---------------------------------------------------------------------------
WITH seed (collection_slug, collection_name, created_at, updated_at) AS (
  VALUES
    ('performance',               'Performance',               '2026-01-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('ultra-high-performance',    'Ultra High Performance',    '2026-01-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('touring',                   'Touring',                   '2026-01-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('sport',                     'Sport',                     '2026-01-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('all-season',                'All Season',                '2026-01-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz),
    ('suv',                       'SUV',                       '2026-01-01T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz)
)
INSERT INTO collections (
  collection_id,
  collection_name,
  collection_slug,
  is_active,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/collection/' || collection_slug),
  collection_name,
  collection_slug,
  TRUE,
  created_at,
  updated_at
FROM seed
ON CONFLICT (collection_id) DO UPDATE
SET collection_name = EXCLUDED.collection_name,
    is_active       = EXCLUDED.is_active,
    updated_at      = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Categories needed by product detail samples
-- ---------------------------------------------------------------------------
WITH seed (category_slug, category_name, category_type, created_at) AS (
  VALUES
    ('sports-tyres', 'Sports Tyres', 'performance'::category_type, '2026-04-01T09:00:00Z'::timestamptz)
)
INSERT INTO categories (
  category_id,
  category_name,
  category_slug,
  category_type,
  is_active,
  created_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/category/' || category_slug),
  category_name,
  category_slug,
  category_type,
  TRUE,
  created_at
FROM seed
ON CONFLICT (category_id) DO UPDATE
SET category_name = EXCLUDED.category_name,
    category_type = EXCLUDED.category_type,
    is_active     = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- Warehouses referenced by admin product / order dummies
-- ---------------------------------------------------------------------------
WITH seed (
  warehouse_key,
  warehouse_name,
  warehouse_type,
  state,
  suburb,
  postcode,
  address,
  contact_name,
  contact_email,
  is_active
) AS (
  VALUES
    ('lahore',       'Lahore Warehouse',               'own'::warehouse_type, 'Punjab',                    'Lahore',    '54000', 'Lahore Distribution Hub',        'Warehouse Team', 'lahore.warehouse@onyx.local', TRUE),
    ('karachi',      'Karachi Warehouse',              'own'::warehouse_type, 'Sindh',                     'Karachi',   '74000', 'Karachi Distribution Hub',       'Warehouse Team', 'karachi.warehouse@onyx.local', TRUE),
    ('islamabad',    'Islamabad Warehouse',            'own'::warehouse_type, 'Islamabad Capital Territory','Islamabad', '44000', 'Islamabad Distribution Hub',     'Warehouse Team', 'islamabad.warehouse@onyx.local', TRUE),
    ('sydney-main',  'Sydney Main Warehouse',          'own'::warehouse_type, 'NSW',                       'Sydney',    '2000',  'Sydney Main Warehouse',          'Warehouse Team', 'sydney.warehouse@onyx.local', TRUE),
    ('melbourne-dc', 'Melbourne Distribution Centre',  'own'::warehouse_type, 'VIC',                       'Melbourne', '3000',  'Melbourne Distribution Centre',  'Warehouse Team', 'melbourne.warehouse@onyx.local', TRUE)
)
INSERT INTO warehouses (
  warehouse_id,
  warehouse_name,
  warehouse_type,
  state,
  suburb,
  postcode,
  address,
  contact_name,
  contact_email,
  is_own_warehouse,
  is_supplier_warehouse,
  is_active,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/warehouse/' || warehouse_key),
  warehouse_name,
  warehouse_type,
  state,
  suburb,
  postcode,
  address,
  contact_name,
  contact_email,
  TRUE,
  FALSE,
  is_active,
  '2026-01-01T00:00:00Z'::timestamptz,
  '2026-05-12T00:00:00Z'::timestamptz
FROM seed
ON CONFLICT (warehouse_id) DO UPDATE
SET warehouse_name        = EXCLUDED.warehouse_name,
    warehouse_type        = EXCLUDED.warehouse_type,
    state                 = EXCLUDED.state,
    suburb                = EXCLUDED.suburb,
    postcode              = EXCLUDED.postcode,
    address               = EXCLUDED.address,
    contact_name          = EXCLUDED.contact_name,
    contact_email         = EXCLUDED.contact_email,
    is_active             = EXCLUDED.is_active,
    updated_at            = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Product patterns
-- ---------------------------------------------------------------------------
WITH seed (
  brand_slug,
  pattern_slug,
  pattern_name,
  collection_slug,
  application_type,
  season_type,
  performance_category,
  pattern_short_description,
  tags,
  is_active,
  show_on_website,
  on_sale,
  discountable,
  created_at,
  updated_at
) AS (
  VALUES
    ('michelin',    'pilot-sport-5',         'Pilot Sport 5',            'performance',            'PCR'::application_type,  'summer'::season_type,     'UHP'::performance_category_type, 'Ultra high-performance summer tyre designed for precision handling and road grip.', ARRAY['summer','performance','sport']::text[], TRUE,  TRUE,  TRUE,  TRUE,  '2026-04-01T09:00:00Z'::timestamptz, '2026-05-12T10:00:00Z'::timestamptz),
    ('pirelli',     'p-zero',                'P Zero',                   'ultra-high-performance', 'PCR'::application_type,  'summer'::season_type,     'UHP'::performance_category_type, NULL, ARRAY[]::text[], TRUE,  TRUE,  FALSE, TRUE, '2026-03-15T12:30:00Z'::timestamptz, '2026-05-10T14:20:00Z'::timestamptz),
    ('bridgestone', 'turanza-t005',          'Turanza T005',             'touring',                'PCR'::application_type,  'summer'::season_type,     'HT'::performance_category_type,  NULL, ARRAY[]::text[], TRUE,  FALSE, FALSE, TRUE, '2026-02-01T11:10:00Z'::timestamptz, '2026-05-08T08:15:00Z'::timestamptz),
    ('goodyear',    'eagle-f1-asymmetric-6', 'Eagle F1 Asymmetric 6',    'sport',                  'PCR'::application_type,  'summer'::season_type,     'UHP'::performance_category_type, NULL, ARRAY[]::text[], TRUE,  TRUE,  FALSE, TRUE, '2026-01-28T15:45:00Z'::timestamptz, '2026-05-09T16:40:00Z'::timestamptz),
    ('hankook',     'ventus-s1-evo3',        'Ventus S1 Evo3',           NULL,                     'PCR'::application_type,  'summer'::season_type,     'UHP'::performance_category_type, NULL, ARRAY[]::text[], FALSE, FALSE, FALSE, TRUE, '2025-12-10T10:05:00Z'::timestamptz, '2026-05-07T13:25:00Z'::timestamptz),
    ('michelin',    'crossclimate-2',        'CrossClimate 2',           'all-season',             'PCR'::application_type,  'all_season'::season_type, 'ECO'::performance_category_type, NULL, ARRAY[]::text[], TRUE,  TRUE,  FALSE, TRUE, '2026-01-15T08:00:00Z'::timestamptz, '2026-05-06T09:10:00Z'::timestamptz),
    ('bridgestone', 'potenza-sport',         'Potenza Sport',            'performance',            'PCR'::application_type,  'summer'::season_type,     'UHP'::performance_category_type, NULL, ARRAY[]::text[], TRUE,  TRUE,  FALSE, TRUE, '2026-02-20T14:30:00Z'::timestamptz, '2026-05-05T11:45:00Z'::timestamptz),
    ('pirelli',     'cinturato-p7',          'Cinturato P7',             'touring',                'PCR'::application_type,  'summer'::season_type,     'HT'::performance_category_type,  NULL, ARRAY[]::text[], TRUE,  TRUE,  FALSE, TRUE, '2026-03-08T10:00:00Z'::timestamptz, '2026-05-04T16:00:00Z'::timestamptz),
    ('bridgestone', 'alenza-sport-as',       'Alenza Sport A/S',         'suv',                    '4x4'::application_type,  'all_season'::season_type, 'AT'::performance_category_type,  NULL, ARRAY[]::text[], TRUE,  FALSE, FALSE, TRUE, '2026-04-01T09:00:00Z'::timestamptz, '2026-05-03T08:30:00Z'::timestamptz),
    ('continental', 'sportcontact-7',        'SportContact 7',           'ultra-high-performance', 'PCR'::application_type,  'summer'::season_type,     'UHP'::performance_category_type, NULL, ARRAY[]::text[], TRUE,  TRUE,  FALSE, TRUE, '2026-01-25T11:00:00Z'::timestamptz, '2026-05-02T12:00:00Z'::timestamptz),
    ('michelin',    'energy-saver-4',        'Energy Saver 4',           'touring',                'PCR'::application_type,  'summer'::season_type,     'ECO'::performance_category_type, NULL, ARRAY[]::text[], FALSE, FALSE, FALSE, TRUE, '2026-01-10T00:00:00Z'::timestamptz, '2026-05-08T10:05:00Z'::timestamptz),
    ('goodyear',    'eagle-f1-asymmetric-5', 'Eagle F1 Asymmetric 5',    'sport',                  'PCR'::application_type,  'summer'::season_type,     'UHP'::performance_category_type, NULL, ARRAY[]::text[], FALSE, FALSE, FALSE, TRUE, '2026-01-10T00:00:00Z'::timestamptz, '2026-05-07T13:25:00Z'::timestamptz)
)
INSERT INTO patterns (
  pattern_id,
  brand_id,
  pattern_name,
  pattern_slug,
  pattern_short_description,
  application_type,
  season_type,
  performance_category,
  collection_id,
  tags,
  is_active,
  show_on_website,
  on_sale,
  discountable,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/pattern/' || brand_slug || '/' || pattern_slug),
  b.brand_id,
  s.pattern_name,
  s.pattern_slug,
  s.pattern_short_description,
  s.application_type,
  s.season_type,
  s.performance_category,
  c.collection_id,
  s.tags,
  s.is_active,
  s.show_on_website,
  s.on_sale,
  s.discountable,
  s.created_at,
  s.updated_at
FROM seed s
JOIN brands b
  ON b.brand_slug = s.brand_slug
LEFT JOIN collections c
  ON c.collection_slug = s.collection_slug
ON CONFLICT (pattern_id) DO UPDATE
SET pattern_name               = EXCLUDED.pattern_name,
    pattern_short_description  = EXCLUDED.pattern_short_description,
    application_type           = EXCLUDED.application_type,
    season_type                = EXCLUDED.season_type,
    performance_category       = EXCLUDED.performance_category,
    collection_id              = EXCLUDED.collection_id,
    tags                       = EXCLUDED.tags,
    is_active                  = EXCLUDED.is_active,
    show_on_website            = EXCLUDED.show_on_website,
    on_sale                    = EXCLUDED.on_sale,
    discountable               = EXCLUDED.discountable,
    updated_at                 = EXCLUDED.updated_at;

INSERT INTO pattern_categories (pattern_id, category_id)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/pattern/michelin/pilot-sport-5'),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/category/sports-tyres')
WHERE NOT EXISTS (
  SELECT 1
  FROM pattern_categories
  WHERE pattern_id  = uuid_generate_v5(uuid_ns_url(), 'onyx/admin/pattern/michelin/pilot-sport-5')
    AND category_id = uuid_generate_v5(uuid_ns_url(), 'onyx/admin/category/sports-tyres')
);

-- ---------------------------------------------------------------------------
-- Explicit SKUs taken from product detail / order dummy data
-- ---------------------------------------------------------------------------
WITH seed (
  sku,
  brand_slug,
  pattern_slug,
  tyre_size_display,
  normalized_size_code,
  width,
  profile,
  rim_size,
  load_index,
  speed_rating,
  status,
  country_of_origin,
  cost_price,
  compare_at_price,
  total_available_stock,
  runflat,
  xl_reinforced,
  ply_rating,
  load_range,
  fuel_rating,
  wet_grip,
  noise_db,
  noise_class,
  created_at,
  updated_at
) AS (
  VALUES
    ('MIC-PS5-22545R17',      'michelin',    'pilot-sport-5',         '225/45R17',                             '22545R17', 225::numeric, 45::numeric, 17::numeric, '94', 'Y', 'active'::sku_status,       'France', 185.00::numeric, 349.00::numeric, 24, TRUE,  TRUE,  '4PR', 'XL', 'A', 'A', '71 dB', 'B', '2026-04-01T09:00:00Z'::timestamptz, '2026-05-12T10:00:00Z'::timestamptz),
    ('MIC-PS5-23540R18',      'michelin',    'pilot-sport-5',         '235/40R18',                             '23540R18', 235::numeric, 40::numeric, 18::numeric, '95', 'Y', 'active'::sku_status,       'France', NULL,             NULL,             8,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-04-01T09:00:00Z'::timestamptz, '2026-05-12T10:00:00Z'::timestamptz),
    ('MIC-PS5-24535R19',      'michelin',    'pilot-sport-5',         '245/35R19',                             '24535R19', 245::numeric, 35::numeric, 19::numeric, '93', 'Y', 'inactive'::sku_status,     'France', NULL,             NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-04-01T09:00:00Z'::timestamptz, '2026-05-12T10:00:00Z'::timestamptz),
    ('MICH-PS5-235R18',       'michelin',    'pilot-sport-5',         'Michelin Pilot Sport 5 235/40R18',     '23540R18', 235::numeric, 40::numeric, 18::numeric, '95', 'Y', 'active'::sku_status,       'France', NULL,             NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-05-11T09:15:00Z'::timestamptz, '2026-05-11T09:15:00Z'::timestamptz),
    ('CONT-SC7-22540R18',     'continental', 'sportcontact-7',        'Continental SportContact 7 225/40R18', '22540R18', 225::numeric, 40::numeric, 18::numeric, NULL, NULL, 'active'::sku_status,       'Germany', NULL,           NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-05-10T08:00:00Z'::timestamptz, '2026-05-10T08:00:00Z'::timestamptz),
    ('GY-EF1A6-24535R19',     'goodyear',    'eagle-f1-asymmetric-6', 'Goodyear Eagle F1 Asymmetric 6 245/35R19', '24535R19', 245::numeric, 35::numeric, 19::numeric, NULL, NULL, 'active'::sku_status,    'Germany', NULL,           NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-05-10T14:22:00Z'::timestamptz, '2026-05-10T14:22:00Z'::timestamptz),
    ('PIR-PZ-27535R21',       'pirelli',     'p-zero',                'Pirelli P Zero 275/35R21',             '27535R21', 275::numeric, 35::numeric, 21::numeric, NULL, NULL, 'active'::sku_status,       'Italy', NULL,             NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-05-09T11:05:00Z'::timestamptz, '2026-05-09T11:05:00Z'::timestamptz),
    ('BRI-T005-20555R16',     'bridgestone', 'turanza-t005',          'Bridgestone Turanza T005 205/55R16',   '20555R16', 205::numeric, 55::numeric, 16::numeric, NULL, NULL, 'active'::sku_status,       'Japan', NULL,             NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-05-09T07:30:00Z'::timestamptz, '2026-05-09T07:30:00Z'::timestamptz),
    ('HAN-S1E3-23540R18',     'hankook',     'ventus-s1-evo3',        'Hankook Ventus S1 Evo3 235/40R18',     '23540R18', 235::numeric, 40::numeric, 18::numeric, NULL, NULL, 'active'::sku_status,       'Korea', NULL,             NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-05-08T15:45:00Z'::timestamptz, '2026-05-08T15:45:00Z'::timestamptz),
    ('MIC-EN4-19565R15',      'michelin',    'energy-saver-4',        'Michelin Energy Saver 4 195/65R15',    '19565R15', 195::numeric, 65::numeric, 15::numeric, NULL, NULL, 'active'::sku_status,       'France', NULL,            NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-05-08T10:00:00Z'::timestamptz, '2026-05-08T10:00:00Z'::timestamptz),
    ('GY-EF1A5-20555R16',     'goodyear',    'eagle-f1-asymmetric-5', 'Goodyear Eagle F1 Asymmetric 5 205/55R16', '20555R16', 205::numeric, 55::numeric, 16::numeric, NULL, NULL, 'active'::sku_status,    'Germany', NULL,           NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-05-07T13:20:00Z'::timestamptz, '2026-05-07T13:20:00Z'::timestamptz),
    ('PIR-PZ-27540R20',       'pirelli',     'p-zero',                'Pirelli P Zero 275/40R20',             '27540R20', 275::numeric, 40::numeric, 20::numeric, NULL, NULL, 'active'::sku_status,       'Italy', NULL,             NULL,             0,  FALSE, FALSE, NULL,  NULL, NULL, NULL, NULL,   NULL, '2026-05-07T08:55:00Z'::timestamptz, '2026-05-07T08:55:00Z'::timestamptz)
)
INSERT INTO skus (
  product_id,
  sku,
  brand_id,
  pattern_id,
  tyre_size_display,
  normalized_size_code,
  width,
  profile,
  rim_size,
  construction_type,
  load_index,
  speed_rating,
  runflat,
  xl_reinforced,
  ply_rating,
  load_range,
  country_of_origin,
  fuel_rating,
  wet_grip,
  noise_db,
  noise_class,
  status,
  total_available_stock,
  cost_price,
  compare_at_price,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/sku/' || s.sku),
  s.sku,
  b.brand_id,
  p.pattern_id,
  s.tyre_size_display,
  s.normalized_size_code,
  s.width,
  s.profile,
  s.rim_size,
  'R'::construction_type,
  s.load_index,
  s.speed_rating,
  s.runflat,
  s.xl_reinforced,
  s.ply_rating,
  s.load_range,
  s.country_of_origin,
  s.fuel_rating,
  s.wet_grip,
  s.noise_db,
  s.noise_class,
  s.status,
  s.total_available_stock,
  s.cost_price,
  s.compare_at_price,
  s.created_at,
  s.updated_at
FROM seed s
JOIN brands b
  ON b.brand_slug = s.brand_slug
JOIN patterns p
  ON p.pattern_slug = s.pattern_slug
 AND p.brand_id = b.brand_id
ON CONFLICT (product_id) DO UPDATE
SET tyre_size_display     = EXCLUDED.tyre_size_display,
    normalized_size_code  = EXCLUDED.normalized_size_code,
    width                 = EXCLUDED.width,
    profile               = EXCLUDED.profile,
    rim_size              = EXCLUDED.rim_size,
    load_index            = EXCLUDED.load_index,
    speed_rating          = EXCLUDED.speed_rating,
    runflat               = EXCLUDED.runflat,
    xl_reinforced         = EXCLUDED.xl_reinforced,
    ply_rating            = EXCLUDED.ply_rating,
    load_range            = EXCLUDED.load_range,
    country_of_origin     = EXCLUDED.country_of_origin,
    fuel_rating           = EXCLUDED.fuel_rating,
    wet_grip              = EXCLUDED.wet_grip,
    noise_db              = EXCLUDED.noise_db,
    noise_class           = EXCLUDED.noise_class,
    status                = EXCLUDED.status,
    total_available_stock = EXCLUDED.total_available_stock,
    cost_price            = EXCLUDED.cost_price,
    compare_at_price      = EXCLUDED.compare_at_price,
    updated_at            = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Placeholder SKUs so admin product list counts stay close to the dummy cards.
-- ---------------------------------------------------------------------------
WITH targets (
  brand_slug,
  pattern_slug,
  sku_prefix,
  variant_count,
  active_variants
) AS (
  VALUES
    ('michelin',    'pilot-sport-5',         'MIC-PS5-PH', 6, 5),
    ('pirelli',     'p-zero',                'PIR-PZ-PH',  4, 4),
    ('bridgestone', 'turanza-t005',          'BRI-T005-PH',3, 2),
    ('goodyear',    'eagle-f1-asymmetric-6', 'GY-EF1A6-PH',8, 7),
    ('hankook',     'ventus-s1-evo3',        'HAN-S1E3-PH',2, 1),
    ('michelin',    'crossclimate-2',        'MIC-CC2-PH', 5, 5),
    ('bridgestone', 'potenza-sport',         'BRI-PSPT-PH',7, 6),
    ('pirelli',     'cinturato-p7',          'PIR-CP7-PH', 4, 4),
    ('bridgestone', 'alenza-sport-as',       'BRI-ALZ-PH', 3, 2),
    ('continental', 'sportcontact-7',        'CONT-SC7-PH',6, 6)
),
existing_counts AS (
  SELECT
    b.brand_slug,
    p.pattern_slug,
    COUNT(*) AS existing_total,
    COUNT(*) FILTER (WHERE s.status = 'active') AS existing_active
  FROM skus s
  JOIN brands b
    ON b.brand_id = s.brand_id
  JOIN patterns p
    ON p.pattern_id = s.pattern_id
  GROUP BY b.brand_slug, p.pattern_slug
),
generated AS (
  SELECT
    t.brand_slug,
    t.pattern_slug,
    t.sku_prefix,
    gs.n,
    GREATEST(t.active_variants - COALESCE(ec.existing_active, 0), 0) AS extra_active_needed
  FROM targets t
  LEFT JOIN existing_counts ec
    ON ec.brand_slug = t.brand_slug
   AND ec.pattern_slug = t.pattern_slug
  CROSS JOIN LATERAL generate_series(
    1,
    GREATEST(t.variant_count - COALESCE(ec.existing_total, 0), 0)
  ) AS gs(n)
)
INSERT INTO skus (
  product_id,
  sku,
  brand_id,
  pattern_id,
  tyre_size_display,
  normalized_size_code,
  width,
  profile,
  rim_size,
  construction_type,
  status,
  country_of_origin,
  total_available_stock,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/sku/' || g.sku_prefix || '-' || LPAD(g.n::text, 2, '0')),
  g.sku_prefix || '-' || LPAD(g.n::text, 2, '0'),
  b.brand_id,
  p.pattern_id,
  p.pattern_name || ' Variant ' || LPAD(g.n::text, 2, '0'),
  (195 + (g.n * 10))::text || (55 - g.n)::text || 'R' || (15 + g.n)::text,
  (195 + (g.n * 10))::numeric,
  (55 - g.n)::numeric,
  (15 + g.n)::numeric,
  'R'::construction_type,
  CASE WHEN g.n <= g.extra_active_needed THEN 'active'::sku_status ELSE 'inactive'::sku_status END,
  COALESCE(b.country_of_brand, 'Australia'),
  0,
  p.created_at,
  p.updated_at
FROM generated g
JOIN brands b
  ON b.brand_slug = g.brand_slug
JOIN patterns p
  ON p.pattern_slug = g.pattern_slug
 AND p.brand_id = b.brand_id
ON CONFLICT (product_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Product stock from the admin product detail dummies
-- ---------------------------------------------------------------------------
WITH seed (sku, warehouse_key, available_stock, reserved_stock, low_stock_alert) AS (
  VALUES
    ('MIC-PS5-22545R17', 'lahore',    12, 0, 10),
    ('MIC-PS5-22545R17', 'karachi',   12, 0, 10),
    ('MIC-PS5-23540R18', 'islamabad',  8, 0, 10)
)
INSERT INTO product_stock (
  stock_id,
  product_id,
  warehouse_id,
  available_stock,
  reserved_stock,
  low_stock_alert,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/product-stock/' || sku || '/' || warehouse_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/sku/' || sku),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/warehouse/' || warehouse_key),
  available_stock,
  reserved_stock,
  low_stock_alert,
  '2026-04-01T09:00:00Z'::timestamptz,
  '2026-05-12T10:00:00Z'::timestamptz
FROM seed
ON CONFLICT (stock_id) DO UPDATE
SET available_stock = EXCLUDED.available_stock,
    reserved_stock  = EXCLUDED.reserved_stock,
    low_stock_alert = EXCLUDED.low_stock_alert,
    updated_at      = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Product prices from admin product detail dummies and order-unit-price samples
-- ---------------------------------------------------------------------------
WITH seed (sku, group_name, price_type, price_inc_gst, created_at) AS (
  VALUES
    ('MIC-PS5-22545R17', 'Retail',      'retail'::price_type,    299.00::numeric, '2026-04-01T09:00:00Z'::timestamptz),
    ('MIC-PS5-22545R17', 'Wholesale',   'wholesale'::price_type, 279.00::numeric, '2026-04-01T09:00:00Z'::timestamptz),
    ('MIC-PS5-22545R17', 'VIP Dealers', 'price_a'::price_type,   265.00::numeric, '2026-04-01T09:00:00Z'::timestamptz),
    ('MIC-PS5-23540R18', 'Retail',      'retail'::price_type,    309.00::numeric, '2026-04-01T09:00:00Z'::timestamptz),
    ('MIC-PS5-23540R18', 'Wholesale',   'wholesale'::price_type, 289.00::numeric, '2026-04-01T09:00:00Z'::timestamptz),
    ('MICH-PS5-235R18',  'Retail',      'retail'::price_type,    225.00::numeric, '2026-05-11T09:15:00Z'::timestamptz),
    ('CONT-SC7-22540R18','Retail',      'retail'::price_type,    182.00::numeric, '2026-05-10T08:00:00Z'::timestamptz),
    ('GY-EF1A6-24535R19','Retail',      'retail'::price_type,    249.00::numeric, '2026-05-10T14:22:00Z'::timestamptz),
    ('PIR-PZ-27535R21',  'Retail',      'retail'::price_type,    309.00::numeric, '2026-05-09T11:05:00Z'::timestamptz),
    ('BRI-T005-20555R16','Retail',      'retail'::price_type,    149.50::numeric, '2026-05-09T07:30:00Z'::timestamptz),
    ('HAN-S1E3-23540R18','Retail',      'retail'::price_type,    239.00::numeric, '2026-05-08T15:45:00Z'::timestamptz),
    ('MIC-EN4-19565R15', 'Retail',      'retail'::price_type,    195.00::numeric, '2026-05-08T10:00:00Z'::timestamptz),
    ('GY-EF1A5-20555R16','Retail',      'retail'::price_type,    144.00::numeric, '2026-05-07T13:20:00Z'::timestamptz),
    ('PIR-PZ-27540R20',  'Retail',      'retail'::price_type,    445.00::numeric, '2026-05-07T08:55:00Z'::timestamptz)
)
INSERT INTO product_prices (
  price_id,
  product_id,
  price_type,
  customer_group_id,
  price_ex_gst,
  price_inc_gst,
  is_active,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/product-price/' || sku || '/' || group_name),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/sku/' || sku),
  price_type,
  (
    SELECT cg.group_id
    FROM customer_groups cg
    WHERE cg.group_name = seed.group_name
    ORDER BY cg.created_at
    LIMIT 1
  ),
  ROUND((price_inc_gst / 1.1)::numeric, 2),
  price_inc_gst,
  TRUE,
  created_at,
  created_at
FROM seed
ON CONFLICT (price_id) DO UPDATE
SET price_type         = EXCLUDED.price_type,
    customer_group_id  = EXCLUDED.customer_group_id,
    price_ex_gst       = EXCLUDED.price_ex_gst,
    price_inc_gst      = EXCLUDED.price_inc_gst,
    is_active          = EXCLUDED.is_active,
    updated_at         = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Customers (10 admin dummy customers + 1 job-only customer)
-- ---------------------------------------------------------------------------
WITH seed (
  dummy_key,
  email,
  first_name,
  last_name,
  company,
  phone,
  created_at
) AS (
  VALUES
    ('cust_001',            'shagun@example.com',          'Shagun', 'Tyagi',  NULL,                    '0400250175', '2025-06-15T00:00:00Z'::timestamptz),
    ('cust_002',            'ali.khan@example.com',        'Ali',    'Khan',   'Khan Fleet Solutions',  '0411223344', '2025-02-10T00:00:00Z'::timestamptz),
    ('cust_003',            'david.lee@example.com',       'David',  'Lee',    NULL,                    '0400111222', '2024-11-05T00:00:00Z'::timestamptz),
    ('cust_004',            'priya.sharma@example.com',    'Priya',  'Sharma', 'Sharma Transport',      '0422334455', '2025-09-20T00:00:00Z'::timestamptz),
    ('cust_005',            'james.walker@example.com',    'James',  'Walker', 'Walker Logistics',      '0433445566', '2024-03-01T00:00:00Z'::timestamptz),
    ('cust_006',            'emma.wilson@example.com',     'Emma',   'Wilson', NULL,                    '0455667788', '2025-07-14T00:00:00Z'::timestamptz),
    ('cust_007',            'liam.chen@example.com',       'Liam',   'Chen',   'Chen Auto Group',       '0466778899', '2025-04-22T00:00:00Z'::timestamptz),
    ('cust_008',            'nadia.hassan@example.com',    'Nadia',  'Hassan', NULL,                    '0477889900', '2025-11-03T00:00:00Z'::timestamptz),
    ('cust_009',            'ryan.murphy@example.com',     'Ryan',   'Murphy', 'Murphy Fleet Mgmt',     '0488991122', '2025-08-17T00:00:00Z'::timestamptz),
    ('cust_010',            'sophie.martin@example.com',   'Sophie', 'Martin', NULL,                    '0499001122', '2024-12-01T00:00:00Z'::timestamptz),
    ('cust_job_olivia_01',  'olivia.brown@example.com',    'Olivia', 'Brown',  NULL,                    '0422114433', '2026-05-05T10:00:00Z'::timestamptz)
),
matched_profiles AS (
  SELECT id, email
  FROM auth.users
  WHERE email IN (SELECT email FROM seed)
)
INSERT INTO customers (
  customer_id,
  profile_id,
  email,
  first_name,
  last_name,
  company,
  phone,
  is_active,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/customer/' || seed.dummy_key),
  mp.id,
  seed.email,
  seed.first_name,
  seed.last_name,
  seed.company,
  seed.phone,
  TRUE,
  seed.created_at,
  seed.created_at
FROM seed
LEFT JOIN matched_profiles mp
  ON mp.email = seed.email
ON CONFLICT (customer_id) DO UPDATE
SET profile_id  = EXCLUDED.profile_id,
    email       = EXCLUDED.email,
    first_name  = EXCLUDED.first_name,
    last_name   = EXCLUDED.last_name,
    company     = EXCLUDED.company,
    phone       = EXCLUDED.phone,
    is_active   = EXCLUDED.is_active,
    updated_at  = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Customer addresses derived from the order dummy snapshots
-- ---------------------------------------------------------------------------
WITH seed (
  dummy_key,
  address_name,
  address_line1,
  city,
  state,
  postal_code,
  country,
  company,
  phone,
  created_at
) AS (
  VALUES
    ('cust_001', 'Primary', '38 Porter St',     'Hemmant',   'QLD', '4174', 'Australia', NULL,                   '0400250175', '2026-05-11T12:35:00Z'::timestamptz),
    ('cust_002', 'Primary', '12 Oxford Street', 'Sydney',    'NSW', '2000', 'Australia', 'Khan Fleet Solutions', '0411223344', '2026-05-11T09:15:00Z'::timestamptz),
    ('cust_003', 'Primary', '12 Logan Road',    'Brisbane',  'QLD', '4120', 'Australia', NULL,                   '0400111222', '2026-05-10T08:00:00Z'::timestamptz),
    ('cust_004', 'Primary', '5 Collins Street', 'Melbourne', 'VIC', '3000', 'Australia', 'Sharma Transport',     '0422334455', '2026-05-10T14:22:00Z'::timestamptz),
    ('cust_005', 'Primary', '88 Pitt Street',   'Sydney',    'NSW', '2000', 'Australia', 'Walker Logistics',     '0433445566', '2026-05-09T11:05:00Z'::timestamptz),
    ('cust_006', 'Primary', '3 Queen Street',   'Brisbane',  'QLD', '4000', 'Australia', NULL,                   '0455667788', '2026-05-09T07:30:00Z'::timestamptz),
    ('cust_007', 'Primary', '99 Hay Street',    'Perth',     'WA',  '6000', 'Australia', 'Chen Auto Group',      '0466778899', '2026-05-08T15:45:00Z'::timestamptz),
    ('cust_008', 'Primary', '7 Pulteney Street','Adelaide',  'SA',  '5000', 'Australia', NULL,                   '0477889900', '2026-05-08T10:00:00Z'::timestamptz),
    ('cust_009', 'Primary', '45 Flinders Street','Melbourne','VIC', '3000', 'Australia', 'Murphy Fleet Mgmt',    '0488991122', '2026-05-07T13:20:00Z'::timestamptz),
    ('cust_010', 'Primary', '22 George Street', 'Sydney',    'NSW', '2000', 'Australia', NULL,                   '0499001122', '2026-05-07T08:55:00Z'::timestamptz)
)
INSERT INTO addresses (
  address_id,
  customer_id,
  address_name,
  address_line1,
  city,
  state,
  postal_code,
  country,
  company,
  phone,
  created_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/address/' || dummy_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/customer/' || dummy_key),
  address_name,
  address_line1,
  city,
  state,
  postal_code,
  country,
  company,
  phone,
  created_at
FROM seed
ON CONFLICT (address_id) DO UPDATE
SET address_name  = EXCLUDED.address_name,
    address_line1 = EXCLUDED.address_line1,
    city          = EXCLUDED.city,
    state         = EXCLUDED.state,
    postal_code   = EXCLUDED.postal_code,
    country       = EXCLUDED.country,
    company       = EXCLUDED.company,
    phone         = EXCLUDED.phone;

-- ---------------------------------------------------------------------------
-- Optional customer-group memberships aligned to the admin customer examples.
-- ---------------------------------------------------------------------------
WITH seed (dummy_key, group_name, added_at) AS (
  VALUES
    ('cust_001', 'Retail',    '2025-06-15T00:00:00Z'::timestamptz),
    ('cust_002', 'Fleet',     '2025-02-10T00:00:00Z'::timestamptz),
    ('cust_002', 'Wholesale', '2025-02-10T00:00:00Z'::timestamptz),
    ('cust_004', 'Fleet',     '2025-09-20T00:00:00Z'::timestamptz),
    ('cust_005', 'VIP',       '2024-03-01T00:00:00Z'::timestamptz),
    ('cust_005', 'Wholesale', '2024-03-01T00:00:00Z'::timestamptz),
    ('cust_007', 'Fleet',     '2025-04-22T00:00:00Z'::timestamptz),
    ('cust_009', 'Fleet',     '2025-08-17T00:00:00Z'::timestamptz),
    ('cust_010', 'VIP',       '2024-12-01T00:00:00Z'::timestamptz)
)
INSERT INTO customer_group_members (customer_id, group_id, added_at)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/customer/' || seed.dummy_key),
  (
    SELECT cg.group_id
    FROM customer_groups cg
    WHERE cg.group_name = seed.group_name
    ORDER BY cg.created_at
    LIMIT 1
  ),
  seed.added_at
FROM seed
WHERE EXISTS (
  SELECT 1
  FROM customer_groups cg
  WHERE cg.group_name = seed.group_name
)
ON CONFLICT (customer_id, group_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Fitment centres
-- ---------------------------------------------------------------------------
WITH seed (
  dummy_key,
  business_name,
  partner_id,
  is_active,
  contact_phone,
  business_number,
  email,
  created_at
) AS (
  VALUES
    ('fitment_001', 'Onyx Shield Brisbane',       'PART-0001', TRUE,  '0733221100', '51 824 753 556', 'brisbane@onyxshield.com.au',       '2024-08-12T00:00:00Z'::timestamptz),
    ('fitment_002', 'Onyx Shield Sydney North',   'PART-0002', TRUE,  '0291234567', '42 711 634 882', 'sydneynorth@onyxshield.com.au',    '2024-09-05T00:00:00Z'::timestamptz),
    ('fitment_003', 'Onyx Shield Melbourne CBD',  'PART-0003', TRUE,  '0396541234', '33 508 922 771', 'melbourne@onyxshield.com.au',      '2024-10-01T00:00:00Z'::timestamptz),
    ('fitment_004', 'Onyx Shield Perth',          'PART-0004', TRUE,  '0892223344', '61 399 401 205', 'perth@onyxshield.com.au',          '2024-11-18T00:00:00Z'::timestamptz),
    ('fitment_005', 'FastFit Adelaide',           'PART-0005', FALSE, '0882339900', '78 240 118 643', 'admin@fastfitadelaide.com.au',     '2025-01-07T00:00:00Z'::timestamptz),
    ('fitment_006', 'Premier Tyre Centre',        'PART-0006', TRUE,  '0755667788', '19 662 530 894', 'service@premiertyrecentre.com.au', '2025-02-22T00:00:00Z'::timestamptz),
    ('fitment_007', 'QuickFit Gold Coast',        'PART-0007', TRUE,  '0756789012', '84 175 903 421', 'contact@quickfitgc.com.au',        '2025-03-14T00:00:00Z'::timestamptz),
    ('fitment_008', 'TyrePro Canberra',           'PART-0008', FALSE, '0261234567', '56 821 047 339', 'info@tyreprocbr.com.au',           '2025-04-03T00:00:00Z'::timestamptz)
),
matched_fitters AS (
  SELECT id, email
  FROM auth.users
  WHERE email IN (SELECT email FROM seed)
)
INSERT INTO fitment_centres (
  fitment_centre_id,
  user_id,
  partner_id,
  centre_name,
  business_name,
  contact_name,
  contact_phone,
  email,
  phone,
  business_number,
  services_offered,
  approved_status,
  is_active,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitment-centre/' || seed.dummy_key),
  mf.id,
  seed.partner_id,
  seed.business_name,
  seed.business_name,
  seed.business_name,
  seed.contact_phone,
  seed.email,
  seed.contact_phone,
  seed.business_number,
  ARRAY['fit_only','supply_and_fit','alignment']::text[],
  'approved'::fitment_approved_status,
  seed.is_active,
  seed.created_at,
  seed.created_at
FROM seed
LEFT JOIN matched_fitters mf
  ON mf.email = seed.email
ON CONFLICT (fitment_centre_id) DO UPDATE
SET user_id          = EXCLUDED.user_id,
    partner_id       = EXCLUDED.partner_id,
    centre_name      = EXCLUDED.centre_name,
    business_name    = EXCLUDED.business_name,
    contact_name     = EXCLUDED.contact_name,
    contact_phone    = EXCLUDED.contact_phone,
    email            = EXCLUDED.email,
    phone            = EXCLUDED.phone,
    business_number  = EXCLUDED.business_number,
    services_offered = EXCLUDED.services_offered,
    approved_status  = EXCLUDED.approved_status,
    is_active        = EXCLUDED.is_active,
    updated_at       = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
WITH seed (
  dummy_key,
  order_number,
  customer_key,
  payment_status,
  fulfillment_status,
  delivery_method,
  fitment_key,
  payment_method,
  currency,
  subtotal_amount,
  shipping_amount,
  tax_amount,
  discount_amount,
  total_amount,
  paid_amount,
  outstanding_amount,
  notes,
  shipping_address_snapshot,
  billing_address_snapshot,
  created_at
) AS (
  VALUES
    ('ord_001', '#49652', 'cust_001', 'paid',           'processing', 'fitment_centre', 'fitment_001', 'stripe',        'AUD', 598.00::numeric,   0.00::numeric,   5.40::numeric,  10.00::numeric,  598.00::numeric,  598.00::numeric,    0.00::numeric, 'Customer requested careful handling during transport.', jsonb_build_object('address_line1','38 Porter St','city','Hemmant','state','QLD','postal_code','4174','country','Australia'), '{}'::jsonb, '2026-05-11T12:35:00Z'::timestamptz),
    ('ord_002', '#49653', 'cust_002', 'paid',           'fulfilled',  'home_delivery',  NULL,          'stripe',        'AUD', 900.00::numeric,  15.00::numeric,  85.09::numeric,   0.00::numeric,  936.00::numeric,  936.00::numeric,    0.00::numeric, 'Leave package near front door.',                              jsonb_build_object('address_line1','12 Oxford Street','city','Sydney','state','NSW','postal_code','2000','country','Australia'), '{}'::jsonb, '2026-05-11T09:15:00Z'::timestamptz),
    ('ord_003', '#49654', 'cust_003', 'partially_paid', 'pending',    'fitment_centre', 'fitment_003', 'bank_transfer', 'AUD', 728.00::numeric,   0.00::numeric,  64.82::numeric,  15.00::numeric,  713.00::numeric,  300.00::numeric,  413.00::numeric, 'Technician should call customer 30 mins before arrival.',    jsonb_build_object('address_line1','12 Logan Road','city','Brisbane','state','QLD','postal_code','4120','country','Australia'), '{}'::jsonb, '2026-05-10T08:00:00Z'::timestamptz),
    ('ord_004', '#49655', 'cust_004', 'unpaid',         'pending',    'home_delivery',  NULL,          NULL,            'AUD', 498.00::numeric,  20.00::numeric,  47.45::numeric,   0.00::numeric,  541.80::numeric,    0.00::numeric,  541.80::numeric, NULL,                                                       jsonb_build_object('address_line1','5 Collins Street','city','Melbourne','state','VIC','postal_code','3000','country','Australia'), '{}'::jsonb, '2026-05-10T14:22:00Z'::timestamptz),
    ('ord_005', '#49656', 'cust_005', 'paid',           'fulfilled',  'fitment_centre', 'fitment_002', 'stripe',        'AUD',1236.00::numeric,   0.00::numeric, 119.27::numeric,  50.00::numeric, 1262.00::numeric, 1262.00::numeric,    0.00::numeric, 'VIP customer - priority booking.',                             jsonb_build_object('address_line1','88 Pitt Street','city','Sydney','state','NSW','postal_code','2000','country','Australia'), '{}'::jsonb, '2026-05-09T11:05:00Z'::timestamptz),
    ('ord_006', '#49657', 'cust_006', 'refunded',       'refunded',   'home_delivery',  NULL,          'stripe',        'AUD', 299.00::numeric,  15.00::numeric,  27.18::numeric,   0.00::numeric,  314.00::numeric,  314.00::numeric,    0.00::numeric, 'Customer changed mind - full refund issued.',                  jsonb_build_object('address_line1','3 Queen Street','city','Brisbane','state','QLD','postal_code','4000','country','Australia'), '{}'::jsonb, '2026-05-09T07:30:00Z'::timestamptz),
    ('ord_007', '#49658', 'cust_007', 'paid',           'paid',       'fitment_centre', 'fitment_004', 'stripe',        'AUD', 956.00::numeric,   0.00::numeric,  87.09::numeric,   0.00::numeric,  956.00::numeric,  956.00::numeric,    0.00::numeric, NULL,                                                       jsonb_build_object('address_line1','99 Hay Street','city','Perth','state','WA','postal_code','6000','country','Australia'), '{}'::jsonb, '2026-05-08T15:45:00Z'::timestamptz),
    ('ord_008', '#49659', 'cust_008', 'paid',           'processing', 'home_delivery',  NULL,          'stripe',        'AUD', 390.00::numeric,  15.00::numeric,  34.09::numeric,  25.00::numeric,  380.00::numeric,  380.00::numeric,    0.00::numeric, 'Gift wrap requested.',                                         jsonb_build_object('address_line1','7 Pulteney Street','city','Adelaide','state','SA','postal_code','5000','country','Australia'), '{}'::jsonb, '2026-05-08T10:00:00Z'::timestamptz),
    ('ord_009', '#49660', 'cust_009', 'paid',           'cancelled',  'fitment_centre', 'fitment_001', 'stripe',        'AUD', 576.00::numeric,   0.00::numeric,  52.36::numeric,   0.00::numeric,  576.00::numeric,  576.00::numeric,    0.00::numeric, 'Cancelled by customer - stock allocated to next order.',       jsonb_build_object('address_line1','45 Flinders Street','city','Melbourne','state','VIC','postal_code','3000','country','Australia'), '{}'::jsonb, '2026-05-07T13:20:00Z'::timestamptz),
    ('ord_010', '#49661', 'cust_010', 'paid',           'fulfilled',  'home_delivery',  NULL,          'stripe',        'AUD',1780.00::numeric,  20.00::numeric, 158.36::numeric, 100.00::numeric, 1680.00::numeric, 1680.00::numeric,    0.00::numeric, NULL,                                                       jsonb_build_object('address_line1','22 George Street','city','Sydney','state','NSW','postal_code','2000','country','Australia'), '{}'::jsonb, '2026-05-07T08:55:00Z'::timestamptz)
)
INSERT INTO orders (
  order_id,
  order_number,
  customer_id,
  payment_status,
  fulfillment_status,
  delivery_method,
  fitment_centre_id,
  payment_method,
  currency,
  subtotal_amount,
  shipping_amount,
  tax_amount,
  discount_amount,
  total_amount,
  paid_amount,
  outstanding_amount,
  notes,
  shipping_address_snapshot,
  billing_address_snapshot,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order/' || dummy_key),
  order_number,
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/customer/' || customer_key),
  payment_status,
  fulfillment_status,
  delivery_method,
  CASE
    WHEN fitment_key IS NULL THEN NULL
    ELSE uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitment-centre/' || fitment_key)
  END,
  payment_method,
  currency,
  subtotal_amount,
  shipping_amount,
  tax_amount,
  discount_amount,
  total_amount,
  paid_amount,
  outstanding_amount,
  notes,
  shipping_address_snapshot,
  billing_address_snapshot,
  created_at,
  created_at
FROM seed
ON CONFLICT (order_id) DO UPDATE
SET order_number               = EXCLUDED.order_number,
    customer_id                = EXCLUDED.customer_id,
    payment_status             = EXCLUDED.payment_status,
    fulfillment_status         = EXCLUDED.fulfillment_status,
    delivery_method            = EXCLUDED.delivery_method,
    fitment_centre_id          = EXCLUDED.fitment_centre_id,
    payment_method             = EXCLUDED.payment_method,
    currency                   = EXCLUDED.currency,
    subtotal_amount            = EXCLUDED.subtotal_amount,
    shipping_amount            = EXCLUDED.shipping_amount,
    tax_amount                 = EXCLUDED.tax_amount,
    discount_amount            = EXCLUDED.discount_amount,
    total_amount               = EXCLUDED.total_amount,
    paid_amount                = EXCLUDED.paid_amount,
    outstanding_amount         = EXCLUDED.outstanding_amount,
    notes                      = EXCLUDED.notes,
    shipping_address_snapshot  = EXCLUDED.shipping_address_snapshot,
    billing_address_snapshot   = EXCLUDED.billing_address_snapshot,
    updated_at                 = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Order items
-- ---------------------------------------------------------------------------
WITH seed (
  item_key,
  order_key,
  sku,
  quantity,
  unit_price,
  created_at
) AS (
  VALUES
    ('item_001', 'ord_001', 'MIC-PS5-22545R17',  2, 299.00::numeric, '2026-05-11T12:35:00Z'::timestamptz),
    ('item_003', 'ord_002', 'MICH-PS5-235R18',   4, 225.00::numeric, '2026-05-11T09:15:00Z'::timestamptz),
    ('item_005', 'ord_003', 'CONT-SC7-22540R18', 4, 182.00::numeric, '2026-05-10T08:00:00Z'::timestamptz),
    ('item_007', 'ord_004', 'GY-EF1A6-24535R19', 2, 249.00::numeric, '2026-05-10T14:22:00Z'::timestamptz),
    ('item_009', 'ord_005', 'PIR-PZ-27535R21',   4, 309.00::numeric, '2026-05-09T11:05:00Z'::timestamptz),
    ('item_011', 'ord_006', 'BRI-T005-20555R16', 2, 149.50::numeric, '2026-05-09T07:30:00Z'::timestamptz),
    ('item_013', 'ord_007', 'HAN-S1E3-23540R18', 4, 239.00::numeric, '2026-05-08T15:45:00Z'::timestamptz),
    ('item_015', 'ord_008', 'MIC-EN4-19565R15',  2, 195.00::numeric, '2026-05-08T10:00:00Z'::timestamptz),
    ('item_017', 'ord_009', 'GY-EF1A5-20555R16', 4, 144.00::numeric, '2026-05-07T13:20:00Z'::timestamptz),
    ('item_019', 'ord_010', 'PIR-PZ-27540R20',   4, 445.00::numeric, '2026-05-07T08:55:00Z'::timestamptz)
)
INSERT INTO order_items (
  order_item_id,
  order_id,
  product_id,
  quantity,
  unit_price,
  total_price,
  fulfilled_quantity,
  created_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order-item/' || item_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order/' || order_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/sku/' || sku),
  quantity,
  unit_price,
  quantity * unit_price,
  0,
  created_at
FROM seed
ON CONFLICT (order_item_id) DO UPDATE
SET order_id     = EXCLUDED.order_id,
    product_id   = EXCLUDED.product_id,
    quantity     = EXCLUDED.quantity,
    unit_price   = EXCLUDED.unit_price,
    total_price  = EXCLUDED.total_price,
    created_at   = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- Order payments
-- ---------------------------------------------------------------------------
WITH seed (
  payment_key,
  order_key,
  payment_reference,
  payment_method,
  status,
  amount,
  currency,
  created_at
) AS (
  VALUES
    ('pay_001', 'ord_001', 'ER75VY1',    'stripe',        'paid',      598.00::numeric, 'AUD', '2026-05-11T12:35:25Z'::timestamptz),
    ('pay_002', 'ord_002', 'PAY-936',    'stripe',        'paid',      936.00::numeric, 'AUD', '2026-05-11T09:20:00Z'::timestamptz),
    ('pay_003', 'ord_003', 'PARTIAL-300','bank_transfer', 'pending',   300.00::numeric, 'AUD', '2026-05-10T08:15:00Z'::timestamptz),
    ('pay_005', 'ord_005', 'PAY-1262',   'stripe',        'paid',     1262.00::numeric, 'AUD', '2026-05-09T11:10:00Z'::timestamptz),
    ('pay_006', 'ord_006', 'REF-314',    'stripe',        'refunded',  314.00::numeric, 'AUD', '2026-05-09T09:00:00Z'::timestamptz),
    ('pay_007', 'ord_007', 'PAY-956',    'stripe',        'paid',      956.00::numeric, 'AUD', '2026-05-08T15:50:00Z'::timestamptz),
    ('pay_008', 'ord_008', 'PAY-380',    'stripe',        'paid',      380.00::numeric, 'AUD', '2026-05-08T10:05:00Z'::timestamptz),
    ('pay_009', 'ord_009', 'PAY-576',    'stripe',        'paid',      576.00::numeric, 'AUD', '2026-05-07T13:25:00Z'::timestamptz),
    ('pay_010', 'ord_010', 'PAY-1680',   'stripe',        'paid',     1680.00::numeric, 'AUD', '2026-05-07T09:00:00Z'::timestamptz)
)
INSERT INTO order_payments (
  payment_id,
  order_id,
  payment_reference,
  payment_method,
  amount,
  currency,
  status,
  created_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order-payment/' || payment_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order/' || order_key),
  payment_reference,
  payment_method,
  amount,
  currency,
  status,
  created_at
FROM seed
ON CONFLICT (payment_id) DO UPDATE
SET order_id           = EXCLUDED.order_id,
    payment_reference  = EXCLUDED.payment_reference,
    payment_method     = EXCLUDED.payment_method,
    amount             = EXCLUDED.amount,
    currency           = EXCLUDED.currency,
    status             = EXCLUDED.status,
    created_at         = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- Order shipments
-- ---------------------------------------------------------------------------
WITH seed (
  shipment_key,
  order_key,
  warehouse_key,
  status,
  tracking_number,
  tracking_uri,
  shipped_at,
  delivered_at,
  created_at
) AS (
  VALUES
    ('ship_001', 'ord_002', 'sydney-main',  'delivered', 'TRK-938271645', 'https://tracking.example.com/TRK-938271645', '2026-05-11T14:00:00Z'::timestamptz, '2026-05-12T10:30:00Z'::timestamptz, '2026-05-11T14:00:00Z'::timestamptz),
    ('ship_002', 'ord_010', 'melbourne-dc', 'delivered', 'TRK-112233445', 'https://tracking.example.com/TRK-112233445', '2026-05-07T15:00:00Z'::timestamptz, '2026-05-09T11:00:00Z'::timestamptz, '2026-05-07T15:00:00Z'::timestamptz)
)
INSERT INTO order_shipments (
  shipment_id,
  order_id,
  warehouse_id,
  shipment_number,
  status,
  tracking_number,
  tracking_uri,
  send_notification,
  created_at,
  shipped_at,
  delivered_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order-shipment/' || shipment_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order/' || order_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/warehouse/' || warehouse_key),
  1,
  status,
  tracking_number,
  tracking_uri,
  TRUE,
  created_at,
  shipped_at,
  delivered_at
FROM seed
ON CONFLICT (shipment_id) DO UPDATE
SET order_id           = EXCLUDED.order_id,
    warehouse_id       = EXCLUDED.warehouse_id,
    shipment_number    = EXCLUDED.shipment_number,
    status             = EXCLUDED.status,
    tracking_number    = EXCLUDED.tracking_number,
    tracking_uri       = EXCLUDED.tracking_uri,
    created_at         = EXCLUDED.created_at,
    shipped_at         = EXCLUDED.shipped_at,
    delivered_at       = EXCLUDED.delivered_at;

WITH seed (shipment_key, item_key, sku, quantity) AS (
  VALUES
    ('ship_001', 'item_003', 'MICH-PS5-235R18', 4),
    ('ship_002', 'item_019', 'PIR-PZ-27540R20', 4)
)
INSERT INTO order_shipment_items (
  id,
  shipment_id,
  order_item_id,
  product_id,
  quantity
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order-shipment-item/' || shipment_key || '/' || item_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order-shipment/' || shipment_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order-item/' || item_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/sku/' || sku),
  quantity
FROM seed
ON CONFLICT (id) DO UPDATE
SET shipment_id  = EXCLUDED.shipment_id,
    order_item_id = EXCLUDED.order_item_id,
    product_id    = EXCLUDED.product_id,
    quantity      = EXCLUDED.quantity;

-- ---------------------------------------------------------------------------
-- Order activity
-- ---------------------------------------------------------------------------
WITH seed (
  activity_key,
  order_key,
  event_type,
  description,
  amount,
  currency,
  created_at
) AS (
  VALUES
    ('act_001', 'ord_001', 'order_paid',       'Payment confirmed',                  598.00::numeric, 'AUD', '2026-05-11T12:36:00Z'::timestamptz),
    ('act_002', 'ord_001', 'order_placed',     'Order placed',                       598.00::numeric, 'AUD', '2026-05-11T12:35:00Z'::timestamptz),
    ('act_003', 'ord_002', 'order_delivered',  'Package delivered',                  NULL,             'AUD', '2026-05-12T10:30:00Z'::timestamptz),
    ('act_004', 'ord_002', 'order_shipped',    'Shipment dispatched',                NULL,             'AUD', '2026-05-11T14:00:00Z'::timestamptz),
    ('act_005', 'ord_003', 'partial_payment',  'Customer paid deposit',              300.00::numeric, 'AUD', '2026-05-10T08:15:00Z'::timestamptz),
    ('act_007', 'ord_004', 'order_placed',     'Order placed',                       541.80::numeric, 'AUD', '2026-05-10T14:22:00Z'::timestamptz),
    ('act_009', 'ord_005', 'job_completed',    'Fitment job completed',              NULL,             'AUD', '2026-05-10T16:00:00Z'::timestamptz),
    ('act_010', 'ord_005', 'order_paid',       'Payment confirmed',                 1262.00::numeric, 'AUD', '2026-05-09T11:10:00Z'::timestamptz),
    ('act_011', 'ord_006', 'order_refunded',   'Full refund processed',              314.00::numeric, 'AUD', '2026-05-09T09:00:00Z'::timestamptz),
    ('act_013', 'ord_007', 'order_paid',       'Payment confirmed',                  956.00::numeric, 'AUD', '2026-05-08T15:50:00Z'::timestamptz),
    ('act_015', 'ord_008', 'order_paid',       'Payment confirmed',                  380.00::numeric, 'AUD', '2026-05-08T10:05:00Z'::timestamptz),
    ('act_017', 'ord_009', 'order_cancelled',  'Order cancelled by customer',        NULL,             'AUD', '2026-05-08T09:00:00Z'::timestamptz),
    ('act_019', 'ord_010', 'order_delivered',  'Package delivered',                  NULL,             'AUD', '2026-05-09T11:00:00Z'::timestamptz)
)
INSERT INTO order_activity (
  activity_id,
  order_id,
  event_type,
  description,
  amount,
  currency,
  created_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order-activity/' || activity_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order/' || order_key),
  event_type,
  description,
  amount,
  currency,
  created_at
FROM seed
ON CONFLICT (activity_id) DO UPDATE
SET order_id     = EXCLUDED.order_id,
    event_type   = EXCLUDED.event_type,
    description  = EXCLUDED.description,
    amount       = EXCLUDED.amount,
    currency     = EXCLUDED.currency,
    created_at   = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- Fitment jobs for admin centre detail and fitment-order samples
-- ---------------------------------------------------------------------------
WITH seed (
  job_key,
  order_key,
  customer_key,
  fitment_key,
  task_number,
  customer_name,
  customer_phone,
  scheduled_date,
  scheduled_time,
  tyre_pattern,
  tyre_size,
  quantity,
  vehicle_model,
  status,
  earnings_amount,
  notes,
  created_at
) AS (
  VALUES
    ('job_001',           'ord_001', 'cust_001',           'fitment_001', '49652-01',      'Shagun Tyagi',  '0400250175', '2026-05-15'::date, '10:00 AM', 'Michelin Pilot Sport 5',       '225/45R17', 2, 'Toyota Camry',        'accepted',          598.00::numeric, NULL,                                              '2026-05-11T12:35:00Z'::timestamptz),
    ('job_002',           NULL,      'cust_003',           'fitment_001', '49654-01',      'David Lee',     '0400111222', '2026-05-14'::date, '11:00 AM', 'Continental SportContact 7',  '225/40R18', 4, 'BMW 3 Series',        'pending',           713.00::numeric, NULL,                                              '2026-05-10T08:00:00Z'::timestamptz),
    ('job_003',           NULL,      'cust_007',           'fitment_001', '49658-01',      'Liam Chen',     '0466778899', '2026-05-12'::date, '09:00 AM', 'Hankook Ventus S1 Evo3',      '235/40R18', 4, 'Mercedes C-Class',   'accepted',          956.00::numeric, NULL,                                              '2026-05-08T15:45:00Z'::timestamptz),
    ('job_004',           NULL,      'cust_005',           'fitment_001', '49656-01',      'James Walker',  '0433445566', '2026-05-10'::date, '02:00 PM', 'Pirelli P Zero',              '275/35R21', 4, 'Porsche 911',        'completed',        1262.00::numeric, NULL,                                              '2026-05-09T11:05:00Z'::timestamptz),
    ('job_005',           'ord_009', 'cust_009',           'fitment_001', '49660-01',      'Ryan Murphy',   '0488991122', '2026-05-10'::date, '03:00 PM', 'Goodyear Eagle F1 Asymmetric 5','205/55R16',4, 'Mazda 3',            'cancelled',         576.00::numeric, NULL,                                              '2026-05-07T13:20:00Z'::timestamptz),
    ('job_006',           NULL,      'cust_job_olivia_01', 'fitment_001', '49648-01',      'Olivia Brown',  '0422114433', '2026-05-06'::date, '01:00 PM', 'Bridgestone Turanza T005',    '205/55R16', 2, 'Honda Civic',        'completed',         390.00::numeric, NULL,                                              '2026-05-05T10:00:00Z'::timestamptz),
    ('ord_003_fitment',   'ord_003', 'cust_003',           'fitment_003', 'FIT-003',       'David Lee',     '0400111222', '2026-05-14'::date, '11:00 AM', 'Continental SportContact 7',  '225/40R18', 4, 'BMW 3 Series',        'customer_notified', 713.00::numeric, 'Technician should call customer 30 mins before arrival.', '2026-05-10T08:00:00Z'::timestamptz),
    ('ord_005_fitment',   'ord_005', 'cust_005',           'fitment_002', 'FIT-005',       'James Walker',  '0433445566', '2026-05-10'::date, '02:00 PM', 'Pirelli P Zero',              '275/35R21', 4, 'Porsche 911',        'completed',        1262.00::numeric, 'VIP customer - priority booking.',                  '2026-05-09T11:05:00Z'::timestamptz),
    ('ord_007_fitment',   'ord_007', 'cust_007',           'fitment_004', 'FIT-007',       'Liam Chen',     '0466778899', '2026-05-12'::date, '09:00 AM', 'Hankook Ventus S1 Evo3',      '235/40R18', 4, 'Mercedes C-Class',   'pending',           956.00::numeric, NULL,                                              '2026-05-08T15:45:00Z'::timestamptz)
)
INSERT INTO fitment_jobs (
  job_id,
  order_id,
  fitment_centre_id,
  customer_id,
  task_number,
  customer_name,
  customer_phone,
  scheduled_date,
  scheduled_time,
  tyre_pattern,
  tyre_size,
  quantity,
  vehicle_model,
  notes,
  status,
  earnings_amount,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitment-job/' || job_key),
  CASE WHEN order_key IS NULL THEN NULL ELSE uuid_generate_v5(uuid_ns_url(), 'onyx/admin/order/' || order_key) END,
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitment-centre/' || fitment_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/customer/' || customer_key),
  task_number,
  customer_name,
  customer_phone,
  scheduled_date,
  scheduled_time,
  tyre_pattern,
  tyre_size,
  quantity,
  vehicle_model,
  notes,
  status,
  earnings_amount,
  created_at,
  created_at
FROM seed
ON CONFLICT (job_id) DO UPDATE
SET order_id            = EXCLUDED.order_id,
    fitment_centre_id   = EXCLUDED.fitment_centre_id,
    customer_id         = EXCLUDED.customer_id,
    task_number         = EXCLUDED.task_number,
    customer_name       = EXCLUDED.customer_name,
    customer_phone      = EXCLUDED.customer_phone,
    scheduled_date      = EXCLUDED.scheduled_date,
    scheduled_time      = EXCLUDED.scheduled_time,
    tyre_pattern        = EXCLUDED.tyre_pattern,
    tyre_size           = EXCLUDED.tyre_size,
    quantity            = EXCLUDED.quantity,
    vehicle_model       = EXCLUDED.vehicle_model,
    notes               = EXCLUDED.notes,
    status              = EXCLUDED.status,
    earnings_amount     = EXCLUDED.earnings_amount,
    updated_at          = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Fitment-centre pricing matrix (fitment_001)
-- ---------------------------------------------------------------------------
WITH seed (
  row_key,
  fitment_key,
  tyre_type,
  rim_range,
  per_tyre,
  per_pair,
  per_set_of_4,
  callout_fee
) AS (
  VALUES
    ('pr_01', 'fitment_001', 'car',      '13_15',   28.00::numeric,  50.00::numeric,  90.00::numeric,  NULL),
    ('pr_02', 'fitment_001', 'car',      '16_18',   35.00::numeric,  62.00::numeric, 115.00::numeric,  NULL),
    ('pr_03', 'fitment_001', 'car',      '19_21',   42.00::numeric,  75.00::numeric, 140.00::numeric,  NULL),
    ('pr_04', 'fitment_001', 'car',      '22_plus', 55.00::numeric,  98.00::numeric, 185.00::numeric,  NULL),
    ('pr_05', 'fitment_001', '4x4',      '16_18',   45.00::numeric,  80.00::numeric, 150.00::numeric,  40.00::numeric),
    ('pr_06', 'fitment_001', '4x4',      '19_21',   55.00::numeric,  98.00::numeric, 185.00::numeric,  40.00::numeric),
    ('pr_07', 'fitment_001', 'run_flat', '16_18',   50.00::numeric,  90.00::numeric, 170.00::numeric,  NULL),
    ('pr_08', 'fitment_001', 'run_flat', '19_21',   60.00::numeric, 108.00::numeric, 200.00::numeric,  NULL)
)
INSERT INTO fitter_pricing (
  id,
  fitment_centre_id,
  tyre_type,
  rim_range,
  per_tyre,
  per_pair,
  per_set_of_4,
  callout_fee,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitter-pricing/' || row_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitment-centre/' || fitment_key),
  tyre_type,
  rim_range,
  per_tyre,
  per_pair,
  per_set_of_4,
  callout_fee,
  '2026-05-12T00:00:00Z'::timestamptz
FROM seed
ON CONFLICT (fitment_centre_id, tyre_type, rim_range) DO UPDATE
SET per_tyre     = EXCLUDED.per_tyre,
    per_pair     = EXCLUDED.per_pair,
    per_set_of_4 = EXCLUDED.per_set_of_4,
    callout_fee  = EXCLUDED.callout_fee,
    updated_at   = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Fitment-centre payout history (fitment_001)
-- ---------------------------------------------------------------------------
WITH seed (
  payout_key,
  fitment_key,
  period_start,
  period_end,
  order_count,
  gross_amount,
  adjustments,
  net_payout,
  status,
  payment_date,
  reference,
  invoice_url,
  settlement_schedule,
  created_at,
  updated_at
) AS (
  VALUES
    ('pmt_01', 'fitment_001', '2026-04-01'::date, '2026-04-30'::date, 14, 6890.00::numeric, -690.00::numeric, 6200.00::numeric, 'completed',   '2026-05-01'::date, 'PAY-APR-001', NULL, 'monthly', '2026-05-01T00:00:00Z'::timestamptz, '2026-05-01T00:00:00Z'::timestamptz),
    ('pmt_02', 'fitment_001', '2026-03-01'::date, '2026-03-31'::date, 11, 7670.00::numeric, -770.00::numeric, 6900.00::numeric, 'completed',   '2026-04-01'::date, 'PAY-MAR-001', NULL, 'monthly', '2026-04-01T00:00:00Z'::timestamptz, '2026-04-01T00:00:00Z'::timestamptz),
    ('pmt_03', 'fitment_001', '2026-02-01'::date, '2026-02-28'::date, 10, 6445.00::numeric, -645.00::numeric, 5800.00::numeric, 'completed',   '2026-03-01'::date, 'PAY-FEB-001', NULL, 'monthly', '2026-03-01T00:00:00Z'::timestamptz, '2026-03-01T00:00:00Z'::timestamptz),
    ('pmt_04', 'fitment_001', '2026-05-01'::date, '2026-05-31'::date,  6, 7480.00::numeric,    0.00::numeric, 7480.00::numeric, 'in_progress', NULL,              NULL,         NULL, 'monthly', '2026-05-12T00:00:00Z'::timestamptz, '2026-05-12T00:00:00Z'::timestamptz)
)
INSERT INTO fitment_centre_payouts (
  id,
  fitment_centre_id,
  period_start,
  period_end,
  order_count,
  gross_amount,
  adjustments,
  net_payout,
  status,
  payment_date,
  reference,
  invoice_url,
  settlement_schedule,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/payout/' || payout_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitment-centre/' || fitment_key),
  period_start,
  period_end,
  order_count,
  gross_amount,
  adjustments,
  net_payout,
  status,
  payment_date,
  reference,
  invoice_url,
  settlement_schedule,
  created_at,
  updated_at
FROM seed
ON CONFLICT (id) DO UPDATE
SET fitment_centre_id   = EXCLUDED.fitment_centre_id,
    period_start        = EXCLUDED.period_start,
    period_end          = EXCLUDED.period_end,
    order_count         = EXCLUDED.order_count,
    gross_amount        = EXCLUDED.gross_amount,
    adjustments         = EXCLUDED.adjustments,
    net_payout          = EXCLUDED.net_payout,
    status              = EXCLUDED.status,
    payment_date        = EXCLUDED.payment_date,
    reference           = EXCLUDED.reference,
    invoice_url         = EXCLUDED.invoice_url,
    settlement_schedule = EXCLUDED.settlement_schedule,
    updated_at          = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Fitment-centre bank details (fitment_001)
-- ---------------------------------------------------------------------------
INSERT INTO fitment_centre_bank_details (
  id,
  fitment_centre_id,
  account_holder,
  bank_name,
  bsb,
  account_number,
  created_at,
  updated_at
)
VALUES (
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/bank-details/bank_001'),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitment-centre/fitment_001'),
  'Onyx Shield Pty Ltd',
  'Commonwealth Bank of Australia',
  '062-000',
  '12345678',
  '2026-05-12T00:00:00Z'::timestamptz,
  '2026-05-12T00:00:00Z'::timestamptz
)
ON CONFLICT (fitment_centre_id) DO UPDATE
SET account_holder = EXCLUDED.account_holder,
    bank_name      = EXCLUDED.bank_name,
    bsb            = EXCLUDED.bsb,
    account_number = EXCLUDED.account_number,
    updated_at     = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Fitment-centre compliance docs (fitment_001)
-- ---------------------------------------------------------------------------
WITH seed (
  doc_key,
  fitment_key,
  policy_type,
  provider,
  policy_number,
  expiry_date,
  status,
  doc_url,
  created_at,
  updated_at
) AS (
  VALUES
    ('doc_001', 'fitment_001', 'Public Liability Insurance',  'QBE Insurance',      'QBE-PL-2024-88734', '2026-12-31'::date, 'valid',   NULL, '2024-08-12T00:00:00Z'::timestamptz, '2025-01-10T00:00:00Z'::timestamptz),
    ('doc_002', 'fitment_001', 'Workers'' Compensation',      'WorkCover QLD',      'WC-QLD-55-20881',   '2026-06-30'::date, 'valid',   NULL, '2024-08-12T00:00:00Z'::timestamptz, '2025-07-01T00:00:00Z'::timestamptz),
    ('doc_003', 'fitment_001', 'Business Licence',            NULL,                 'BL-QLD-20249821',   '2026-09-15'::date, 'valid',   NULL, '2024-08-15T00:00:00Z'::timestamptz, '2025-09-16T00:00:00Z'::timestamptz),
    ('doc_004', 'fitment_001', 'Product Liability Insurance', NULL,                 NULL,                 NULL,                'pending', NULL, '2026-04-01T00:00:00Z'::timestamptz, '2026-04-01T00:00:00Z'::timestamptz)
)
INSERT INTO fitment_centre_compliance_docs (
  id,
  fitment_centre_id,
  policy_type,
  provider,
  policy_number,
  expiry_date,
  status,
  doc_url,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/compliance-doc/' || doc_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitment-centre/' || fitment_key),
  policy_type,
  provider,
  policy_number,
  expiry_date,
  status,
  doc_url,
  created_at,
  updated_at
FROM seed
ON CONFLICT (id) DO UPDATE
SET fitment_centre_id = EXCLUDED.fitment_centre_id,
    policy_type       = EXCLUDED.policy_type,
    provider          = EXCLUDED.provider,
    policy_number     = EXCLUDED.policy_number,
    expiry_date       = EXCLUDED.expiry_date,
    status            = EXCLUDED.status,
    doc_url           = EXCLUDED.doc_url,
    updated_at        = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Monthly fitter earnings rows so fitment-centre stats have DB-backed history.
-- ---------------------------------------------------------------------------
WITH seed (month_key, fitment_key, amount, status, payment_date, created_at) AS (
  VALUES
    ('2025-06', 'fitment_001', 3200.00::numeric, 'completed',   '2025-06-30'::date, '2025-06-15T00:00:00Z'::timestamptz),
    ('2025-07', 'fitment_001', 4800.00::numeric, 'completed',   '2025-07-31'::date, '2025-07-15T00:00:00Z'::timestamptz),
    ('2025-08', 'fitment_001', 5100.00::numeric, 'completed',   '2025-08-31'::date, '2025-08-15T00:00:00Z'::timestamptz),
    ('2025-09', 'fitment_001', 3900.00::numeric, 'completed',   '2025-09-30'::date, '2025-09-15T00:00:00Z'::timestamptz),
    ('2025-10', 'fitment_001', 6200.00::numeric, 'completed',   '2025-10-31'::date, '2025-10-15T00:00:00Z'::timestamptz),
    ('2025-11', 'fitment_001', 5400.00::numeric, 'completed',   '2025-11-30'::date, '2025-11-15T00:00:00Z'::timestamptz),
    ('2025-12', 'fitment_001', 7100.00::numeric, 'completed',   '2025-12-31'::date, '2025-12-15T00:00:00Z'::timestamptz),
    ('2026-01', 'fitment_001', 4300.00::numeric, 'completed',   '2026-01-31'::date, '2026-01-15T00:00:00Z'::timestamptz),
    ('2026-02', 'fitment_001', 5800.00::numeric, 'completed',   '2026-02-28'::date, '2026-02-15T00:00:00Z'::timestamptz),
    ('2026-03', 'fitment_001', 6900.00::numeric, 'completed',   '2026-03-31'::date, '2026-03-15T00:00:00Z'::timestamptz),
    ('2026-04', 'fitment_001', 8200.00::numeric, 'completed',   '2026-04-30'::date, '2026-04-15T00:00:00Z'::timestamptz),
    ('2026-05', 'fitment_001', 7480.00::numeric, 'pending',     NULL,                '2026-05-12T00:00:00Z'::timestamptz)
)
INSERT INTO fitter_earnings (
  id,
  fitment_centre_id,
  job_id,
  customer_name,
  amount,
  status,
  payment_date,
  created_at
)
SELECT
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitter-earnings/' || month_key),
  uuid_generate_v5(uuid_ns_url(), 'onyx/admin/fitment-centre/' || fitment_key),
  NULL,
  'Monthly admin seed',
  amount,
  status,
  payment_date,
  created_at
FROM seed
ON CONFLICT (id) DO UPDATE
SET fitment_centre_id = EXCLUDED.fitment_centre_id,
    customer_name     = EXCLUDED.customer_name,
    amount            = EXCLUDED.amount,
    status            = EXCLUDED.status,
    payment_date      = EXCLUDED.payment_date,
    created_at        = EXCLUDED.created_at;
