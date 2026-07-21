-- Reserve the staff-access lock/unlock setting for the primary administrator.
-- Run this file LAST in the Supabase SQL Editor.

DROP POLICY IF EXISTS "Admin manages portal settings" ON public.portal_settings;
CREATE POLICY "Admin manages portal settings"
ON public.portal_settings FOR ALL
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') = 'regaltulipschool@gmail.com'
  OR (
    lower(auth.jwt() ->> 'email') = 'ogechiukwuifunanya@gmail.com'
    AND key <> 'staff_access_enabled'
  )
)
WITH CHECK (
  lower(auth.jwt() ->> 'email') = 'regaltulipschool@gmail.com'
  OR (
    lower(auth.jwt() ->> 'email') = 'ogechiukwuifunanya@gmail.com'
    AND key <> 'staff_access_enabled'
  )
);
