-- Regal Tulip Result Portal DB init

-- students table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  term TEXT NOT NULL,
  average_score NUMERIC NOT NULL CHECK (average_score >= 0 AND average_score <= 100),
  assessment_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adds detailed report data support to an existing students table.
ALTER TABLE students ADD COLUMN IF NOT EXISTS assessment_data JSONB;

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_term ON students(term);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);

-- portal settings and staff access
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

CREATE INDEX IF NOT EXISTS idx_staff_access_email ON staff_access(email);

-- Optional: enable RLS and policies (run as needed)
-- ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Authenticated users can read portal settings" ON portal_settings
--   FOR SELECT
--   USING (auth.role() = 'authenticated');

-- ALTER TABLE staff_access ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Authenticated users can read staff access" ON staff_access
--   FOR SELECT
--   USING (auth.role() = 'authenticated');

-- Enable RLS for students and basic policies
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Read all results" ON students
--   FOR SELECT
--   USING (true);
