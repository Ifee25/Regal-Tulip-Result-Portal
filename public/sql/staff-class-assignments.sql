-- Regal Tulip staff email allowlist and class-level access control.
-- Run this entire file once in the Supabase SQL Editor.
-- IMPORTANT: Run it before enabling/testing new sign-ups. Existing auth users
-- are snapshotted so they retain sign-in access after the allowlist starts.

CREATE TABLE IF NOT EXISTS public.staff_class_assignments (
  email TEXT NOT NULL,
  class_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (email, class_name)
);

CREATE TABLE IF NOT EXISTS public.grandfathered_staff_accounts (
  user_id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  grandfathered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grandfathered_staff_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_class_assignments FROM anon, authenticated;
REVOKE ALL ON public.grandfathered_staff_accounts FROM anon, authenticated;

-- Preserve every account that exists at the moment this migration is run.
INSERT INTO public.grandfathered_staff_accounts (user_id, email)
SELECT id, lower(email)
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_class_assignments (email, class_name) VALUES
  ('mijane4real@gmail.com', 'Primary 3R'),
  ('onuigbochidimmamaureen042@gmail.com', 'Nursery 3R'),
  ('chinaemeremmirabel@gmail.com', 'Nursery 1S'),
  ('faithgodwinbest@gmail.com', 'Nursery 3T'),
  ('onyii4god91@gmail.com', 'Nursery 2R'),
  ('chinecheremekweozor@gmail.com', 'Nursery 1T'),
  ('osigweoluchukwu33@gmail.com', 'Nursery 1R'),
  ('chidimma92@gmail.com', 'Primary 4R'),
  ('divinevictory253@gmail.com', 'Nursery 2T'),
  ('chyfavour13@gmail.com', 'Nursery 2T'),
  ('fabian.i.nwangwu@gmail.com', 'Primary 4T'),
  ('hopeanyina@gmail.com', 'Primary 2T'),
  ('chidimmachukwu584@gmail.com', 'Nursery 1R'),
  ('dreafou@gmail.com', 'Primary 6R'),
  ('honestaewelum@gmail.com', 'Primary 5R'),
  ('enibejennifer33@gmail.com', 'Primary 1T'),
  ('giftchidimma0224@gmail.com', 'Primary 3T'),
  ('kelechukwuchidimma32@gmail.com', 'Primary 4R'),
  ('kinkymomee352@gmail.com', 'Primary 1R')
ON CONFLICT (email, class_name) DO UPDATE SET active = TRUE;

CREATE OR REPLACE FUNCTION public.is_staff_portal_email_allowed(candidate_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lower(candidate_email) IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.staff_class_assignments
      WHERE lower(email) = lower(candidate_email) AND active
    )
    OR EXISTS (
      SELECT 1 FROM public.grandfathered_staff_accounts
      WHERE lower(email) = lower(candidate_email)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_assigned_to_class(candidate_email TEXT, candidate_class TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_class_assignments
    WHERE lower(email) = lower(candidate_email)
      AND class_name = candidate_class
      AND active
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_portal_email_allowed(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff_assigned_to_class(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_portal_email_allowed(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_assigned_to_class(TEXT, TEXT) TO authenticated;

-- Replace the existing Before User Created hook while keeping deleted-email blocking.
CREATE OR REPLACE FUNCTION public.hook_block_deleted_emails(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signup_email TEXT := lower(event->'user'->>'email');
BEGIN
  IF EXISTS (SELECT 1 FROM public.blocked_emails WHERE lower(email) = signup_email) THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'This email address is no longer allowed to create an account.'
    ));
  END IF;

  IF signup_email NOT IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com')
     AND NOT EXISTS (
       SELECT 1 FROM public.staff_class_assignments
       WHERE lower(email) = signup_email AND active
     ) THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'This email address is not authorized to create a staff account.'
    ));
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hook_block_deleted_emails(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_block_deleted_emails(JSONB) FROM anon, authenticated, public;

-- Enforce the assigned class even if someone modifies the browser request.
DROP POLICY IF EXISTS "Authorized staff can upload results" ON public.students;
DROP POLICY IF EXISTS "Authorized staff can upload own results" ON public.students;
CREATE POLICY "Assigned staff can upload own class results"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND lower(uploaded_by_email) = lower(auth.jwt() ->> 'email')
  AND NOT public.is_email_blocked(auth.jwt() ->> 'email')
  AND coalesce(auth.jwt() -> 'user_metadata' ->> 'portal_role', 'staff') <> 'guardian'
  AND (
    lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com')
    OR (
      EXISTS (
        SELECT 1 FROM public.portal_settings
        WHERE key = 'staff_access_enabled' AND value = 'true'
      )
      AND public.is_staff_assigned_to_class(auth.jwt() ->> 'email', class_name)
    )
  )
);
