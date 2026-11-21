# Supabase Setup Guide

## Overview
This guide will help you set up the Supabase database schema for the Result Portal. You'll create tables for students and results, configure Row Level Security (RLS), and seed sample data if needed.

## Prerequisites
- A Supabase project created at https://supabase.com
- Access to the Supabase dashboard
- Your project URL and anon key in `.env.local`

## Step 1: Create the Students Table

In the Supabase SQL Editor, run the following SQL:

```sql
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  term TEXT NOT NULL,
  average_score NUMERIC NOT NULL CHECK (average_score >= 0 AND average_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_students_class ON students(class_name);
CREATE INDEX idx_students_term ON students(term);
CREATE INDEX idx_students_created_at ON students(created_at);
```

## Step 2: Create portal settings and staff access tables

In the Supabase SQL Editor, run this SQL to persist admin lock status and authorized upload emails:

```sql
CREATE TABLE IF NOT EXISTS portal_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_access_email ON staff_access(email);
```

These tables are used by the admin dashboard to store:
- `staff_access_enabled` and `admin_email` in `portal_settings`
- authorized staff email addresses in `staff_access`

If you want the new tables to be protected by Supabase Row Level Security, run this SQL too:

```sql
ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read portal settings" ON portal_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage portal settings" ON portal_settings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE staff_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read staff access" ON staff_access
  FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage staff access" ON staff_access
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## Step 4: Enable Row Level Security (RLS)

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anyone to read all results (public view)
CREATE POLICY "Read all results" ON students
  FOR SELECT
  USING (true);

-- Policy 2: Allow authenticated admins to insert/update/delete
CREATE POLICY "Admins can insert results" ON students
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update results" ON students
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete results" ON students
  FOR DELETE
  USING (auth.role() = 'authenticated');
```

## Step 5: Seed Sample Data

Run this optional SQL to add test data:

```sql
INSERT INTO students (student_name, class_name, term, average_score) VALUES
  ('Ada Thompson', 'Nursery 2', 'First Term', 88),
  ('John Doe', 'Primary 4', 'Second Term', 91),
  ('Jane Smith', 'Primary 1', 'First Term', 85),
  ('Bright Okafor', 'Nursery 1', 'Third Term', 92);
```

## Step 4: Set Up Auth Roles (Optional but Recommended)

For stricter role-based access, you can add an `admin_users` table:

```sql
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update RLS policies to check admin_users table
DROP POLICY "Admins can insert results" ON students;
DROP POLICY "Admins can update results" ON students;
DROP POLICY "Admins can delete results" ON students;

CREATE POLICY "Admins can insert results" ON students
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update results" ON students
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete results" ON students
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
```

## Step 5: Enable Auth Signup (Optional)

In the Supabase dashboard:
1. Go to **Authentication** > **Providers**
2. Ensure **Email** provider is enabled
3. Go to **Auth** > **URL Configuration** and add your app domains
   - For local development, add `http://localhost:3000` and `http://127.0.0.1:3000`
   - For production, add your real domain such as `https://your-school-portal.com`
4. (Optional) Set up email templates for sign-up confirmations

> You can skip this step for now if you are only testing locally. The app can still work for local sign-in/sign-up, but you should add your production domain before going live.

## Verification

To verify everything is set up:

1. Go to the Supabase SQL Editor and run:
   ```sql
   SELECT COUNT(*) FROM students;
   ```
   You should see your sample data count.

2. Test signing up at `/dashboard` in your app.

3. Try creating/editing/deleting a result as a signed-in admin.

## Troubleshooting

- **"supabaseUrl is required"**: Check that `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **No data showing**: Verify RLS policies allow public SELECT on `students` table
- **Can't create/edit/delete**: Verify your auth user exists in the `admin_users` table (if using strict role-based access)

## Registered pupils and guardian access

Set REGISTRATION_SUPABASE_URL and REGISTRATION_SUPABASE_SECRET_KEY in the server environment. These belong to the pupil registration project and must never use a NEXT_PUBLIC_ prefix. Keep SUPABASE_SECRET_KEY configured for the result portal project. Restart the server after changing environment values.

Teachers choose an active registered pupil in the selected year group. Registration currently stores year groups without R/S/T arms; teachers must choose pupils assigned to their arm. Duplicate names require an explicit Reg No selection. Result assessment_data stores pupil_id (the registration UUID) and reg_no so guardian access does not depend on names. Earlier-term lookups use this same UUID. Existing reports without pupil_id must be reviewed and linked before they appear in guardian accounts; name-only matches are not used.

Guardians sign in at /guardian using guardian_phone and admission_number. Phone formatting spaces and punctuation are ignored; enter the same country-code format as the registered number. Sessions use a signed HttpOnly cookie valid for one hour. Results are fetched server-side only for the authenticated pupil UUID. Login attempts are limited per registration number in server memory; multi-instance deployments need a shared rate limiter for a global limit.

Validation: node --test tests/guardian.test.cjs and npx.cmd tsc --noEmit.
