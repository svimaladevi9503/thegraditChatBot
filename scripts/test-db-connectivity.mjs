import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseKey = '';
let serviceRoleKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) {
      const key = k.trim();
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' || key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
    }
  });
}

console.log('================================================================');
console.log('🔍 PHASE 3.2 — LIVE SUPABASE DATABASE CONNECTIVITY AUDIT');
console.log('================================================================\n');

console.log('--- STEP 1: Environment Variables Check ---');
console.log(`SUPABASE_URL: ${supabaseUrl ? '✓ Present' : '✗ Missing'}`);
console.log(`ANON/PUBLISHABLE KEY: ${supabaseKey ? '✓ Present' : '✗ Missing'}`);
console.log(`SERVICE ROLE KEY: ${serviceRoleKey ? '✓ Present' : '✗ Missing'}\n`);

const client = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function runAudit() {
  // TEST A: Connection test
  console.log('--- TEST A: Basic Connection & Health Check ---');
  const start = Date.now();
  const { data: pingData, error: pingErr, status: pingStatus } = await client.from('students').select('count', { count: 'exact', head: true });
  const latency = Date.now() - start;
  
  if (pingErr) {
    console.log(`✗ Connection failed: [${pingErr.code}] ${pingErr.message}`);
    console.log(`  Details: ${pingErr.details || 'None'}`);
    console.log(`  Hint: ${pingErr.hint || 'None'}`);
  } else {
    console.log(`✓ Connection successful (HTTP ${pingStatus}, Latency: ${latency}ms)`);
  }
  console.log('\n');

  // TEST B: public.students
  console.log('--- TEST B: Table public.students ---');
  const { data: studentsData, error: studentsErr } = await client.from('students').select('*').limit(5);
  if (studentsErr) {
    console.log(`✗ Query failed: [${studentsErr.code}] ${studentsErr.message}`);
  } else {
    console.log(`✓ Query successful: Rows returned: ${studentsData.length}`);
    if (studentsData.length > 0) {
      console.log(`  Available columns: ${Object.keys(studentsData[0]).join(', ')}`);
      console.log(`  Sample row:`, JSON.stringify(studentsData[0], null, 2));
    } else {
      console.log(`  ⚠️ 0 rows returned.`);
    }
  }
  console.log('\n');

  // TEST C: public.student_attendance_summary
  console.log('--- TEST C: View public.student_attendance_summary ---');
  const { data: attData, error: attErr } = await client.from('student_attendance_summary').select('*').limit(5);
  if (attErr) {
    console.log(`✗ Query failed: [${attErr.code}] ${attErr.message}`);
  } else {
    console.log(`✓ Query successful: Rows returned: ${attData.length}`);
    if (attData.length > 0) {
      console.log(`  Available columns: ${Object.keys(attData[0]).join(', ')}`);
      console.log(`  Sample row:`, JSON.stringify(attData[0], null, 2));
    } else {
      console.log(`  ⚠️ 0 rows returned.`);
    }
  }
  console.log('\n');

  // TEST D: public.student_fee_summary
  console.log('--- TEST D: View public.student_fee_summary ---');
  const { data: feeData, error: feeErr } = await client.from('student_fee_summary').select('*').limit(5);
  if (feeErr) {
    console.log(`✗ Query failed: [${feeErr.code}] ${feeErr.message}`);
  } else {
    console.log(`✓ Query successful: Rows returned: ${feeData.length}`);
    if (feeData.length > 0) {
      console.log(`  Available columns: ${Object.keys(feeData[0]).join(', ')}`);
      console.log(`  Sample row:`, JSON.stringify(feeData[0], null, 2));
    } else {
      console.log(`  ⚠️ 0 rows returned.`);
    }
  }
  console.log('\n');

  // TEST E: Search for "Rahul" or any existing student records
  console.log('--- TEST E: Search for "Rahul" & Check Existing Student Records ---');
  const { data: allStudents, error: allErr } = await client.from('students').select('*');
  if (allErr) {
    console.log(`✗ Search failed: [${allErr.code}] ${allErr.message}`);
  } else if (allStudents.length === 0) {
    console.log(`⚠️ Total students returned from database: 0`);
    console.log(`Conclusion: "Rahul does not exist in the live database (0 student records accessible via current credentials)."`);
  } else {
    console.log(`✓ Total students returned: ${allStudents.length}`);
    const rahulMatches = allStudents.filter(s => 
      (s.first_name && s.first_name.toLowerCase().includes('rahul')) ||
      (s.name && s.name.toLowerCase().includes('rahul')) ||
      (s.student_id && s.student_id.toLowerCase().includes('rahul'))
    );
    if (rahulMatches.length > 0) {
      console.log(`FOUND STUDENTS MATCHING "Rahul":`);
      rahulMatches.forEach((s, idx) => {
        const name = s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
        console.log(`  ${idx + 1}. ${name} — ${s.student_id || s.id} — ${s.department || s.department_id || 'N/A'}`);
      });
    } else {
      console.log(`"Rahul" does not exist in the live database.`);
      console.log(`First 3 actual students in database:`);
      allStudents.slice(0, 3).forEach((s, idx) => {
        const name = s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
        console.log(`  ${idx + 1}. ${name} — ${s.student_id || s.id}`);
      });
    }
  }
  console.log('\n================================================================\n');
}

runAudit().catch(err => console.error('Audit script error:', err));
