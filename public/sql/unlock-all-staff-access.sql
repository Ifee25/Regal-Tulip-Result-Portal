-- Regal Tulip bulk staff-access policy.
-- Run this entire file once in the Supabase SQL Editor.
-- When staff_access_enabled is true, every authenticated, non-blocked account
-- may upload its own results. Locking the setting disables staff uploads again.

DROP POLICY IF EXISTS "Authorized staff can upload own results" ON public.students;

CREATE POLICY "Authorized staff can upload own results"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND lower(uploaded_by_email) = lower(auth.jwt() ->> 'email')
  AND NOT public.is_email_blocked(auth.jwt() ->> 'email')
  AND coalesce(auth.jwt() -> 'user_metadata' ->> 'portal_role', 'staff') <> 'guardian'
  AND (
    lower(auth.jwt() ->> 'email') IN ('regaltulipschool@gmail.com', 'ogechukwuifunanya@gmail.com')
    OR (
      EXISTS (
        SELECT 1 FROM public.portal_settings
        WHERE key = 'staff_access_enabled' AND value = 'true'
      )
      AND public.is_staff_assigned_to_class(auth.jwt() ->> 'email', class_name)
    )
  )
);
