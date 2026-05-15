drop view if exists public.fitment_centres_with_users;

create view public.fitment_centres_with_users as
select
  fc.fitment_centre_id,
  fc.user_id,
  fc.business_name,
  fc.partner_id,
  fc.is_active,
  fc.contact_phone,
  fc.business_number,
  fc.created_at,
  p.role,
  au.email
from fitment_centres fc
left join profiles p
  on p.id = fc.user_id
left join auth.users au
  on au.id = p.id;