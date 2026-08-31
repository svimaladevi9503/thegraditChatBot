import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('====================================================');
console.log('🔍 LIVE SUPABASE CONNECTION DIAGNOSTIC TEST');
console.log('====================================================');
console.log(`URL Configured: ${Boolean(supabaseUrl)} (${supabaseUrl ? supabaseUrl.replace(/^(https:\/\/[^.]+).*/, '$1...') : 'None'})`);
console.log(`Publishable Key Configured: ${Boolean(publishableKey)}`);
console.log(`Service Role Key Configured: ${Boolean(serviceRoleKey)}`);
console.log('----------------------------------------------------');

if (!supabaseUrl || (!publishableKey && !serviceRoleKey)) {
  console.error('❌ Supabase credentials missing in .env.local');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey || publishableKey);

const targets = [
  { name: 'public.students', table: 'students', select: '*' },
  { name: 'public.departments', table: 'departments', select: '*' },
  { name: 'public.classes', table: 'classes', select: '*' },
  { name: 'public.attendance', table: 'attendance', select: '*' },
  { name: 'public.fees', table: 'fees', select: '*' },
  { name: 'public.student_attendance_summary', table: 'student_attendance_summary', select: '*' },
  { name: 'public.student_fee_summary', table: 'student_fee_summary', select: '*' },
];

async function runDiagnostic() {
  for (const t of targets) {
    try {
      const { data, error, count } = await client
        .from(t.table)
        .select(t.select, { count: 'exact' })
        .limit(3);

      if (error) {
        let state = 'CONNECTION_ERROR';
        if (error.code === '42501' || error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('policy')) {
          state = 'PERMISSION_ERROR (RLS issue)';
        } else if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
          state = 'SCHEMA_ERROR (Table/View not found)';
        }
        console.log(`❌ [${t.name}] -> ${state}`);
        console.log(`   Code: ${error.code} | Message: ${error.message}`);
      } else {
        const rowCount = count !== null ? count : (data?.length || 0);
        const state = (data && data.length > 0) ? 'SUCCESS' : 'EMPTY (0 rows returned)';
        console.log(`✅ [${t.name}] -> ${state} | Total Rows: ${rowCount}`);
        if (data && data.length > 0) {
          console.log(`   Sample columns: ${Object.keys(data[0]).join(', ')}`);
          console.log(`   Sample row: ${JSON.stringify(data[0])}`);
        }
      }
    } catch (err) {
      console.log(`💥 [${t.name}] -> CONNECTION_ERROR`);
      console.log(`   Error: ${err.message}`);
    }
    console.log('----------------------------------------------------');
  }
}

runDiagnostic();
