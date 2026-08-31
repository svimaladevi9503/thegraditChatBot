-- =========================================================
-- GRADit! - Supabase RLS Read Policies
-- Run this in your Supabase SQL Editor to allow the application
-- and ChatBot to read existing live data via publishable/anon key.
-- =========================================================

-- 1. Enable read access on public.departments
ALTER TABLE IF EXISTS public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on departments" 
ON public.departments FOR SELECT 
TO anon, authenticated 
USING (true);

-- 2. Enable read access on public.classes
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on classes" 
ON public.classes FOR SELECT 
TO anon, authenticated 
USING (true);

-- 3. Enable read access on public.faculty
ALTER TABLE IF EXISTS public.faculty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on faculty" 
ON public.faculty FOR SELECT 
TO anon, authenticated 
USING (true);

-- 4. Enable read access on public.students
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on students" 
ON public.students FOR SELECT 
TO anon, authenticated 
USING (true);

-- 5. Enable read access on public.attendance
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on attendance" 
ON public.attendance FOR SELECT 
TO anon, authenticated 
USING (true);

-- 6. Enable read access on public.fees
ALTER TABLE IF EXISTS public.fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on fees" 
ON public.fees FOR SELECT 
TO anon, authenticated 
USING (true);

-- Note: Views (student_attendance_summary & student_fee_summary)
-- automatically inherit RLS from their underlying tables in PostgreSQL 15+.
