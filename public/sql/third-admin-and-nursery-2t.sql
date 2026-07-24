-- Add the third administrator, replace the Nursery 2T teacher assignment,
-- and allow teachers to save corrections to results they uploaded.
-- Run this entire file once in the Supabase SQL Editor.

DELETE FROM public.staff_class_assignments
WHERE class_name = 'Nursery 2T';

INSERT INTO public.staff_class_assignments (email, class_name, active)
VALUES ('teachernenye@gmail.com', 'Nursery 2T', TRUE)
ON CONFLICT (email, class_name) DO UPDATE SET active = TRUE;

CREATE OR REPLACE FUNCTION public.is_staff_portal_email_allowed(candidate_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lower(candidate_email) IN (
      'regaltulipschool@gmail.com',
      'ogechukwuifunanya@gmail.com',
      'chinwe.f.n@gmail.com'
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_class_assignments
      WHERE lower(email) = lower(candidate_email) AND active
    )
    OR EXISTS (
      SELECT 1 FROM public.grandfathered_staff_accounts
      WHERE lower(email) = lower(candidate_email)
    );
$$;

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

  IF signup_email NOT IN (
       'regaltulipschool@gmail.com',
       'ogechukwuifunanya@gmail.com',
       'chinwe.f.n@gmail.com'
     )
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

DROP POLICY IF EXISTS "Teachers view own results and admin views all" ON public.students;
CREATE POLICY "Teachers view own results and admin views all"
ON public.students FOR SELECT TO authenticated
USING (
  lower(auth.jwt() ->> 'email') IN (
    'regaltulipschool@gmail.com',
    'ogechukwuifunanya@gmail.com',
    'chinwe.f.n@gmail.com'
  )
  OR uploaded_by = auth.uid()
);

DROP POLICY IF EXISTS "Assigned staff can upload own class results" ON public.students;
CREATE POLICY "Assigned staff can upload own class results"
ON public.students FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND lower(uploaded_by_email) = lower(auth.jwt() ->> 'email')
  AND NOT public.is_email_blocked(auth.jwt() ->> 'email')
  AND coalesce(auth.jwt() -> 'user_metadata' ->> 'portal_role', 'staff') <> 'guardian'
  AND (
    lower(auth.jwt() ->> 'email') IN (
      'regaltulipschool@gmail.com',
      'ogechukwuifunanya@gmail.com',
      'chinwe.f.n@gmail.com'
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.portal_settings
        WHERE key = 'staff_access_enabled' AND value = 'true'
      )
      AND public.is_staff_assigned_to_class(auth.jwt() ->> 'email', class_name)
    )
  )
);

DROP POLICY IF EXISTS "Only admin can update results" ON public.students;
DROP POLICY IF EXISTS "Admins and owners can update results" ON public.students;
CREATE POLICY "Admins and owners can update results"
ON public.students FOR UPDATE TO authenticated
USING (
  lower(auth.jwt() ->> 'email') IN (
    'regaltulipschool@gmail.com',
    'ogechukwuifunanya@gmail.com',
    'chinwe.f.n@gmail.com'
  )
  OR uploaded_by = auth.uid()
)
WITH CHECK (
  lower(auth.jwt() ->> 'email') IN (
    'regaltulipschool@gmail.com',
    'ogechukwuifunanya@gmail.com',
    'chinwe.f.n@gmail.com'
  )
  OR (
    uploaded_by = auth.uid()
    AND lower(uploaded_by_email) = lower(auth.jwt() ->> 'email')
    AND public.is_staff_assigned_to_class(auth.jwt() ->> 'email', class_name)
  )
);

DROP POLICY IF EXISTS "Only admin can delete results" ON public.students;
CREATE POLICY "Only admin can delete results"
ON public.students FOR DELETE TO authenticated
USING (
  lower(auth.jwt() ->> 'email') IN (
    'regaltulipschool@gmail.com',
    'ogechukwuifunanya@gmail.com',
    'chinwe.f.n@gmail.com'
  )
);

-- The second and third administrators have matching access. Only the primary
-- administrator can change the global staff upload lock.
DROP POLICY IF EXISTS "Admin manages portal settings" ON public.portal_settings;
CREATE POLICY "Admin manages portal settings"
ON public.portal_settings FOR ALL TO authenticated
USING (
  lower(auth.jwt() ->> 'email') = 'regaltulipschool@gmail.com'
  OR (
    lower(auth.jwt() ->> 'email') IN ('ogechukwuifunanya@gmail.com', 'chinwe.f.n@gmail.com')
    AND key <> 'staff_access_enabled'
  )
)
WITH CHECK (
  lower(auth.jwt() ->> 'email') = 'regaltulipschool@gmail.com'
  OR (
    lower(auth.jwt() ->> 'email') IN ('ogechukwuifunanya@gmail.com', 'chinwe.f.n@gmail.com')
    AND key <> 'staff_access_enabled'
  )
);

DROP POLICY IF EXISTS "Admin manages staff access" ON public.staff_access;
CREATE POLICY "Admin manages staff access"
ON public.staff_access FOR ALL TO authenticated
USING (
  lower(auth.jwt() ->> 'email') IN (
    'regaltulipschool@gmail.com',
    'ogechukwuifunanya@gmail.com',
    'chinwe.f.n@gmail.com'
  )
)
WITH CHECK (
  lower(auth.jwt() ->> 'email') IN (
    'regaltulipschool@gmail.com',
    'ogechukwuifunanya@gmail.com',
    'chinwe.f.n@gmail.com'
  )
);

DROP POLICY IF EXISTS "Teachers read own access and admin reads all" ON public.staff_access;
CREATE POLICY "Teachers read own access and admin reads all"
ON public.staff_access FOR SELECT TO authenticated
USING (
  lower(auth.jwt() ->> 'email') IN (
    'regaltulipschool@gmail.com',
    'ogechukwuifunanya@gmail.com',
    'chinwe.f.n@gmail.com'
  )
  OR lower(email) = lower(auth.jwt() ->> 'email')
);
