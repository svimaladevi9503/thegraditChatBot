import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhdgcynmrbiloivyaloz.supabase.co';
const supabaseKey = 'sb_publishable_cL9O3egusk8QHI7ioz970w_ySjKqK87';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAll() {
  const tables = ['students', 'departments', 'faculty', 'classes', 'attendance', 'fees', 'student_fee_summary', 'student_attendance_summary'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(3);
    console.log(`Table/View [${t}]:`, { count: data?.length, error: error?.message || null, sample: data?.[0] });
  }
}

testAll();
