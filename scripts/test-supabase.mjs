import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhdgcynmrbiloivyaloz.supabase.co';
const supabaseKey = 'sb_publishable_cL9O3egusk8QHI7ioz970w_ySjKqK87';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSupabase() {
  console.log('Testing Supabase Connection...');

  // 1. Check students
  const { data: students, error: sErr } = await supabase.from('students').select('*').limit(3);
  console.log('Students result:', { count: students?.length, error: sErr, sample: students?.[0] });

  // 2. Check student_attendance_summary view
  const { data: attSummary, error: aErr } = await supabase.from('student_attendance_summary').select('*').limit(3);
  console.log('Attendance View result:', { count: attSummary?.length, error: aErr, sample: attSummary?.[0] });

  // 3. Check student_fee_summary view
  const { data: feeSummary, error: fErr } = await supabase.from('student_fee_summary').select('*').limit(3);
  console.log('Fee View result:', { count: feeSummary?.length, error: fErr, sample: feeSummary?.[0] });
}

inspectSupabase();
