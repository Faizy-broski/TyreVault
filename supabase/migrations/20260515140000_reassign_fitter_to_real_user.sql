-- =============================================================================
-- Reassign seeded fitter data to the real Supabase account.
-- Run ONCE after 20260515130000_seed_fitter_dummy_data.sql.
-- =============================================================================

BEGIN;

-- 1. Elevate real user's profile to fitter role
INSERT INTO profiles (id, role, created_at, updated_at)
SELECT id, 'fitter', now(), now()
FROM auth.users
WHERE email = 'faizanhashmi603@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'fitter', updated_at = now();

-- 2. Point the seeded fitment centre at the real user
--    (uuid_generate_v5 key must exactly match the seed migration)
UPDATE fitment_centres
SET
  user_id      = (SELECT id FROM auth.users WHERE email = 'faizanhashmi603@gmail.com'),
  email        = 'faizanhashmi603@gmail.com',
  contact_name = 'Faizan Hashmi',
  updated_at   = now()
WHERE fitment_centre_id = uuid_generate_v5(uuid_ns_url(), 'onyx/fitter/centre/fitter@tyrevault.dev');

-- 3. Remove the dummy auth user that was created by the seed
DELETE FROM auth.users
WHERE email = 'fitter@tyrevault.dev';

COMMIT;
