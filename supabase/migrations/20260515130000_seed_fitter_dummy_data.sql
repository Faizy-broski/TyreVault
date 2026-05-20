-- =============================================================================
-- Fitter portal dummy data seed
-- Creates one complete fitter account so the dashboard, schedule, earnings,
-- and pricing pages all render real data from the API.
--
-- Login credentials (Supabase local / staging):
--   Email:    fitter@tyrevault.dev
--   Password: Fitter@123
--
-- All UUIDs are deterministic via uuid_generate_v5 — safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Auth user
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  uuid_generate_v5(uuid_ns_url(), 'onyx/fitter/user/fitter@tyrevault.dev'),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'fitter@tyrevault.dev',
  crypt('Fitter@123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '', '', '', ''
)
ON CONFLICT (id) DO UPDATE
  SET encrypted_password = crypt('Fitter@123', gen_salt('bf')),
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
      updated_at         = now();

-- ---------------------------------------------------------------------------
-- 2. Profile (role = fitter)
-- ---------------------------------------------------------------------------
INSERT INTO profiles (id, role, created_at, updated_at)
VALUES (
  uuid_generate_v5(uuid_ns_url(), 'onyx/fitter/user/fitter@tyrevault.dev'),
  'fitter',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET role = 'fitter', updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Fitment centre
-- ---------------------------------------------------------------------------
INSERT INTO fitment_centres (
  fitment_centre_id,
  user_id,
  partner_id,
  business_name,
  contact_name,
  contact_phone,
  email,
  business_number,
  services_offered,
  approved_status,
  is_active,
  created_at,
  updated_at
)
VALUES (
  uuid_generate_v5(uuid_ns_url(), 'onyx/fitter/centre/fitter@tyrevault.dev'),
  uuid_generate_v5(uuid_ns_url(), 'onyx/fitter/user/fitter@tyrevault.dev'),
  'FC-DEV-001',
  'Vault Tyre Specialists',
  'Dev Fitter',
  '+61 400 123 456',
  'fitter@tyrevault.dev',
  '12 345 678 901',
  ARRAY['fit_only','supply_and_fit','alignment']::text[],
  'approved',
  true,
  now(),
  now()
)
ON CONFLICT (fitment_centre_id) DO UPDATE
  SET business_name    = EXCLUDED.business_name,
      contact_phone    = EXCLUDED.contact_phone,
      is_active        = EXCLUDED.is_active,
      approved_status  = EXCLUDED.approved_status,
      updated_at       = now();

-- ---------------------------------------------------------------------------
-- 4. Dummy customer (required by fitment_jobs.customer_id NOT NULL)
-- ---------------------------------------------------------------------------
INSERT INTO customers (
  customer_id,
  email,
  first_name,
  last_name,
  created_at,
  updated_at
)
VALUES (
  uuid_generate_v5(uuid_ns_url(), 'onyx/fitter/dummy-customer'),
  'dummy-customer@tyrevault.dev',
  'Tyre',
  'Customer',
  now(),
  now()
)
ON CONFLICT (customer_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Fitment jobs  (scheduled relative to today so schedule always looks live)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  cid  UUID := uuid_generate_v5(uuid_ns_url(), 'onyx/fitter/centre/fitter@tyrevault.dev');
  cust UUID := uuid_generate_v5(uuid_ns_url(), 'onyx/fitter/dummy-customer');
  t    DATE := CURRENT_DATE;
BEGIN

  INSERT INTO fitment_jobs (
    job_id, fitment_centre_id, customer_id, task_number,
    customer_name, customer_phone,
    scheduled_date, scheduled_time,
    tyre_pattern, tyre_size, quantity, vehicle_model,
    status, earnings_amount, created_at, updated_at
  ) VALUES
  -- ── Pending (today + tomorrow) ─────────────────────────────────────────
  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/001'), cid, cust, 'TV-D001',
   'James Walker',   '+61 412 334 889', t,     '09:30:00',
   'Michelin Pilot Sport 5',         '245/40R18', 4, 'BMW 330i',
   'pending', 320, now()-'2 days'::interval, now()),

  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/002'), cid, cust, 'TV-D002',
   'Sarah Johnson',  '+61 488 993 221', t,     '14:00:00',
   'Bridgestone Turanza T005',       '225/55R17', 2, 'Toyota Camry',
   'pending', 180, now()-'2 days'::interval, now()),

  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/003'), cid, cust, 'TV-D003',
   'Ahmed Raza',     '+61 455 111 900', t+1,   '11:15:00',
   'Pirelli P Zero',                 '255/35R19', 4, 'Audi RS5',
   'pending', 450, now()-'1 day'::interval, now()),

  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/004'), cid, cust, 'TV-D004',
   'Daniel Cooper',  '+61 433 456 222', t+1,   '08:00:00',
   'Goodyear Eagle F1',              '235/45R18', 4, 'Mercedes C300',
   'pending', 390, now()-'3 days'::interval, now()),

  -- ── Accepted (later this week) ─────────────────────────────────────────
  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/005'), cid, cust, 'TV-D005',
   'Emily Watson',   '+61 499 111 882', t+2,   '16:30:00',
   'Continental PremiumContact 7',   '215/60R16', 2, 'Honda Civic',
   'accepted', 160, now()-'4 days'::interval, now()),

  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/006'), cid, cust, 'TV-D006',
   'Liam Anderson',  '+61 488 123 321', t+3,   '09:00:00',
   'Toyo Proxes Sport',              '265/35R18', 2, 'Ford Mustang GT',
   'accepted', 285, now()-'3 days'::interval, now()),

  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/007'), cid, cust, 'TV-D007',
   'Priya Sharma',   '+61 411 222 333', t+4,   '10:00:00',
   'Hankook Ventus Prime',           '205/55R16', 4, 'Mazda 3',
   'accepted', 240, now()-'2 days'::interval, now()),

  -- ── Completed (past days) ──────────────────────────────────────────────
  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/008'), cid, cust, 'TV-D008',
   'Michael Lee',    '+61 422 881 300', t-2,   '10:00:00',
   'Yokohama ADVAN Sport',           '275/30R20', 4, 'Porsche Panamera',
   'completed', 520, now()-'5 days'::interval, now()),

  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/009'), cid, cust, 'TV-D009',
   'Olivia Brown',   '+61 466 345 100', t-3,   '13:45:00',
   'Hankook Ventus Prime',           '205/55R16', 4, 'Mazda CX-5',
   'completed', 240, now()-'6 days'::interval, now()),

  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/010'), cid, cust, 'TV-D010',
   'Noah Williams',  '+61 455 999 777', t-5,   '15:00:00',
   'Dunlop SP Sport Maxx',           '225/45R17', 2, 'Subaru WRX',
   'completed', 210, now()-'8 days'::interval, now()),

  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/011'), cid, cust, 'TV-D011',
   'Emma Wilson',    '+61 400 555 666', t-7,   '09:30:00',
   'Michelin CrossClimate 2',        '215/55R17', 4, 'Kia Sportage',
   'completed', 380, now()-'10 days'::interval, now()),

  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/012'), cid, cust, 'TV-D012',
   'Ryan Murphy',    '+61 433 777 888', t-9,   '11:00:00',
   'Pirelli Cinturato P7',           '245/45R18', 2, 'BMW 530i',
   'completed', 290, now()-'12 days'::interval, now()),

  -- ── Cancelled ──────────────────────────────────────────────────────────
  (uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/013'), cid, cust, 'TV-D013',
   'Sophia Martinez', '+61 433 777 111', t-1,  '12:30:00',
   'BFGoodrich Advantage Control',   '215/55R17', 4, 'Hyundai Tucson',
   'cancelled', 0, now()-'4 days'::interval, now())

  ON CONFLICT (job_id) DO UPDATE
    SET scheduled_date  = EXCLUDED.scheduled_date,
        scheduled_time  = EXCLUDED.scheduled_time,
        status          = EXCLUDED.status,
        earnings_amount = EXCLUDED.earnings_amount,
        updated_at      = now();

END $$;

-- ---------------------------------------------------------------------------
-- 6. Fitter earnings (one per completed job — mix of pending / paid)
-- ---------------------------------------------------------------------------
INSERT INTO fitter_earnings (id, fitment_centre_id, job_id, customer_name, amount, status, payment_date, created_at)
VALUES
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/earning/008'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/008'),
 'Michael Lee',   520, 'paid',    CURRENT_DATE-1,  now()-'2 days'::interval),

(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/earning/009'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/009'),
 'Olivia Brown',  240, 'pending', NULL,             now()-'3 days'::interval),

(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/earning/010'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/010'),
 'Noah Williams', 210, 'paid',    CURRENT_DATE-4,   now()-'5 days'::interval),

(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/earning/011'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/011'),
 'Emma Wilson',   380, 'pending', NULL,             now()-'7 days'::interval),

(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/earning/012'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/job/012'),
 'Ryan Murphy',   290, 'paid',    CURRENT_DATE-8,   now()-'9 days'::interval)

ON CONFLICT (id) DO UPDATE
  SET amount       = EXCLUDED.amount,
      status       = EXCLUDED.status,
      payment_date = EXCLUDED.payment_date;

-- ---------------------------------------------------------------------------
-- 7. Fitter pricing matrix  (3 tyre types × 4 rim ranges)
-- ---------------------------------------------------------------------------
INSERT INTO fitter_pricing (
  id, fitment_centre_id, tyre_type, rim_range,
  per_tyre, per_pair, per_set_of_4, callout_fee, updated_at
)
VALUES
-- car
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/car/13_15'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 'car','13_15',   45,  85, 160, NULL, now()),
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/car/16_18'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 'car','16_18',   55, 100, 190, NULL, now()),
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/car/19_21'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 'car','19_21',   65, 120, 225, NULL, now()),
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/car/22_plus'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 'car','22_plus',  80, 150, 280, NULL, now()),
-- 4x4
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/4x4/13_15'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 '4x4','13_15',   55, 100, 190, NULL, now()),
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/4x4/16_18'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 '4x4','16_18',   65, 120, 225, NULL, now()),
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/4x4/19_21'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 '4x4','19_21',   75, 140, 260, NULL, now()),
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/4x4/22_plus'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 '4x4','22_plus',  90, 170, 320,  35, now()),
-- run_flat
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/run_flat/13_15'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 'run_flat','13_15',   70, 130, 245, NULL, now()),
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/run_flat/16_18'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 'run_flat','16_18',   80, 150, 280, NULL, now()),
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/run_flat/19_21'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 'run_flat','19_21',   95, 180, 340,  40, now()),
(uuid_generate_v5(uuid_ns_url(),'onyx/fitter/pricing/run_flat/22_plus'),
 uuid_generate_v5(uuid_ns_url(),'onyx/fitter/centre/fitter@tyrevault.dev'),
 'run_flat','22_plus', 110, 210, 400,  50, now())

ON CONFLICT (fitment_centre_id, tyre_type, rim_range) DO UPDATE
  SET per_tyre     = EXCLUDED.per_tyre,
      per_pair     = EXCLUDED.per_pair,
      per_set_of_4 = EXCLUDED.per_set_of_4,
      callout_fee  = EXCLUDED.callout_fee,
      updated_at   = now();
