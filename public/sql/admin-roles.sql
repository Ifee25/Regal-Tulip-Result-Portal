-- Regal Tulip role-based access policies
-- Administrators: regaltulipschool@gmail.com and ogechiukwuifunanya@gmail.com

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.students TO anon, authenticated;
GRANT INSERT ON public.students TO authenticated;
GRANT UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT ON public.portal_settings, public.staff_access TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portal_settings, public.staff_access TO authenticated;

INSERT INTO public.portal_settings (key, value)
VALUES
  ('admin_email', 'regaltulipschool@gmail.com'),
  ('staff_access_enabled', 'false')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read all results" ON public.students;
DROP POLICY IF EXISTS "Public can view results" ON public.students;
DROP POLICY IF EXISTS "Authenticated staff can upload results" ON public.students;
DROP POLICY IF EXISTS "Authenticated staff can update results" ON public.students;
DROP POLICY IF EXISTS "Authenticated staff can delete results" ON public.students;
DROP POLICY IF EXISTS "Authorized staff can upload results" ON public.students;
DROP POLICY IF EXISTS "Only admin can update results" ON public.students;
DROP POLICY IF EXISTS "Only admin can delete results" ON public.students;

CREATE POLICY "Public can view results"
ON public.students FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authorized staff can upload results"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (
  lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com')
  OR (
    EXISTS (
      SELECT 1 FROM public.portal_settings
      WHERE key = 'staff_access_enabled' AND value = 'true'
    )
    AND EXISTS (
      SELECT 1 FROM public.staff_access
      WHERE lower(email) = lower(auth.jwt() ->> 'email')
    )
  )
);

CREATE POLICY "Only admin can update results"
ON public.students FOR UPDATE
TO authenticated
USING (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'))
WITH CHECK (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'));

CREATE POLICY "Only admin can delete results"
ON public.students FOR DELETE
TO authenticated
USING (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'));

DROP POLICY IF EXISTS "Authenticated users can read portal settings" ON public.portal_settings;
DROP POLICY IF EXISTS "Admin manages portal settings" ON public.portal_settings;
CREATE POLICY "Authenticated users can read portal settings"
ON public.portal_settings FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Admin manages portal settings"
ON public.portal_settings FOR ALL
TO authenticated
USING (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'))
WITH CHECK (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'));

DROP POLICY IF EXISTS "Authenticated users can read staff access" ON public.staff_access;
DROP POLICY IF EXISTS "Admin manages staff access" ON public.staff_access;
CREATE POLICY "Authenticated users can read staff access"
ON public.staff_access FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Admin manages staff access"
ON public.staff_access FOR ALL
TO authenticated
USING (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'))
WITH CHECK (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'));
