-- Permanent account blocklist and Before User Created auth hook.

CREATE TABLE IF NOT EXISTS public.blocked_emails (
  email TEXT PRIMARY KEY,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_by TEXT NOT NULL
);

ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blocked_emails FROM anon, authenticated;

-- Allow result policies to check the private blocklist without granting
-- teachers direct SELECT access to blocked email addresses.
CREATE OR REPLACE FUNCTION public.is_email_blocked(candidate_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_emails
    WHERE lower(email) = lower(candidate_email)
  );
$$;

REVOKE ALL ON FUNCTION public.is_email_blocked(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_email_blocked(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.hook_block_deleted_emails(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signup_email TEXT;
BEGIN
  signup_email := lower(event->'user'->>'email');
  IF EXISTS (SELECT 1 FROM public.blocked_emails WHERE lower(email) = signup_email) THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'This email address is no longer allowed to create an account.'
      )
    );
  END IF;
  RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hook_block_deleted_emails(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_block_deleted_emails(JSONB) FROM anon, authenticated, public;

-- Ensure blocked users with an unexpired token cannot upload new results.
DROP POLICY IF EXISTS "Authorized staff can upload results" ON public.students;
CREATE POLICY "Authorized staff can upload results"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_email_blocked(auth.jwt() ->> 'email')
  AND (
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
  )
);
