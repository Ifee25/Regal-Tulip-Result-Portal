-- Replace the Primary 3T teacher assignment.
-- Run this entire file once in the Supabase SQL Editor.

DELETE FROM public.staff_class_assignments
WHERE class_name = 'Primary 3T';

INSERT INTO public.staff_class_assignments (email, class_name, active)
VALUES ('nnk33423@gmail.com', 'Primary 3T', TRUE)
ON CONFLICT (email, class_name) DO UPDATE SET active = TRUE;

-- Confirm the active Primary 3T assignment.
SELECT email, class_name, active
FROM public.staff_class_assignments
WHERE class_name = 'Primary 3T';
