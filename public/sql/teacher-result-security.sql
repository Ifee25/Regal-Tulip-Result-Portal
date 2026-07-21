-- Regal Tulip teacher-owned results and class-isolated storage.
-- Run this entire file once in the Supabase SQL Editor.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploaded_by_email TEXT;

ALTER TABLE public.students
  ALTER COLUMN uploaded_by SET DEFAULT auth.uid();

-- Private helper used by the upload policy. Including it here makes this
-- migration safe even if the account-management script was not run first.
CREATE TABLE IF NOT EXISTS public.blocked_emails (
  email TEXT PRIMARY KEY,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_by TEXT NOT NULL
);
ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blocked_emails FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_email_blocked(candidate_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_emails
    WHERE lower(email) = lower(candidate_email)
  );
$$;

REVOKE ALL ON FUNCTION public.is_email_blocked(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_email_blocked(TEXT) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_students_uploaded_by
  ON public.students(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_students_class_owner_created
  ON public.students(class_name, uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_class_term_session
  ON public.students(class_name, term, ((assessment_data->>'session')));

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read all results" ON public.students;
DROP POLICY IF EXISTS "Public can view results" ON public.students;
DROP POLICY IF EXISTS "Teachers view own results and admin views all" ON public.students;
CREATE POLICY "Teachers view own results and admin views all"
ON public.students FOR SELECT
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com')
  OR uploaded_by = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated staff can upload results" ON public.students;
DROP POLICY IF EXISTS "Authorized staff can upload results" ON public.students;
CREATE POLICY "Authorized staff can upload own results"
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

DROP POLICY IF EXISTS "Authenticated staff can update results" ON public.students;
DROP POLICY IF EXISTS "Only admin can update results" ON public.students;
CREATE POLICY "Only admin can update results"
ON public.students FOR UPDATE
TO authenticated
USING (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'))
WITH CHECK (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'));

DROP POLICY IF EXISTS "Authenticated staff can delete results" ON public.students;
DROP POLICY IF EXISTS "Only admin can delete results" ON public.students;
CREATE POLICY "Only admin can delete results"
ON public.students FOR DELETE
TO authenticated
USING (lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com'));

-- Teachers may see only their own access grant; the administrator sees all grants.
DROP POLICY IF EXISTS "Authenticated users can read staff access" ON public.staff_access;
DROP POLICY IF EXISTS "Teachers read own access and admin reads all" ON public.staff_access;
CREATE POLICY "Teachers read own access and admin reads all"
ON public.staff_access FOR SELECT
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechiukwuifunanya@gmail.com')
  OR lower(email) = lower(auth.jwt() ->> 'email')
);

-- Existing rows predate uploader tracking and are deliberately admin-only.
-- Assign one to its real teacher only after verifying the account UUID:
-- UPDATE public.students
-- SET uploaded_by = '<teacher auth.users id>', uploaded_by_email = '<teacher email>'
-- WHERE id = '<result id>';
