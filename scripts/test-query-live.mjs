import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhdgcynmrbiloivyaloz.supabase.co';
const supabaseKey = 'sb_publishable_cL9O3egusk8QHI7ioz970w_ySjKqK87';

const client = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const cand = 'Rahul';
  console.log('Testing query for candidate:', cand);
  const { data, error } = await client
    .from('students')
    .select('id, student_id, first_name, last_name, email, department_id, class_id, admission_year, is_active')
    .or(`student_id.ilike.%${cand}%,first_name.ilike.%${cand}%,last_name.ilike.%${cand}%`)
    .limit(1);

  console.log('Result:', { data, error });
}

testQuery();
