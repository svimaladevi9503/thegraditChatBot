import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const { OrchestratorAgent } = await import('../src/lib/chatEngine.ts');
const { StudentResolver } = await import('../src/lib/studentResolver.ts');
const { StudentService } = await import('../src/backend/services/studentService.ts');

console.log('================================================================');
console.log('🧪 PHASE 3 — ATTENDANCE & FEES QUERY INTELLIGENCE TEST SUITE');
console.log('================================================================\n');

async function runTestSuite() {
  const testCases = [
    {
      id: 'TEST 1: Individual Attendance Query',
      query: "What is Rahul's attendance?",
      expectedAgent: ['ATTENDANCE', 'ORCHESTRATOR'], // Ambiguous if multiple, Attendance if single
    },
    {
      id: 'TEST 2: Individual Fee Query',
      query: "What is Rahul's pending fee?",
      expectedAgent: ['FEE', 'ORCHESTRATOR'],
    },
    {
      id: 'TEST 3: Exact Roll Number Lookup',
      query: "Show attendance for 2025CSE019",
      expectedAgent: ['ATTENDANCE', 'ORCHESTRATOR'],
    },
    {
      id: 'TEST 4: Ambiguous Student Name Handling',
      query: "Show fees for Sharma",
      expectedAgent: ['FEE', 'ORCHESTRATOR'],
    },
    {
      id: 'TEST 5: Unknown Student Query',
      query: "What is John Doe's attendance?",
      expectedAgent: ['ATTENDANCE', 'ORCHESTRATOR'],
      expectedTextSnippet: "I couldn't find a student matching that name.",
    },
    {
      id: 'TEST 6: Overall Attendance Query',
      query: "Overall attendance",
      expectedAgent: ['COLLECTIVE_ATTENDANCE'],
      expectedTextSnippet: "Overall Attendance Summary",
    },
    {
      id: 'TEST 7: Attendance Shortage Query',
      query: "Attendance shortage list",
      expectedAgent: ['COLLECTIVE_ATTENDANCE'],
      expectedTextSnippet: "Attendance Shortage",
    },
    {
      id: 'TEST 8: Eligible Students Query',
      query: "How many students are eligible?",
      expectedAgent: ['COLLECTIVE_ATTENDANCE'],
      expectedTextSnippet: "Exam Eligibility Summary",
    },
    {
      id: 'TEST 9: Total Fee Collection Query',
      query: "Total fees collected",
      expectedAgent: ['COLLECTIVE_FEE'],
      expectedTextSnippet: "Fee Collection Summary",
    },
    {
      id: 'TEST 10: Pending Fee Summary Query',
      query: "How much fee is pending?",
      expectedAgent: ['COLLECTIVE_FEE'],
      expectedTextSnippet: "Pending Fee Summary",
    },
    {
      id: 'TEST 11: Students With Pending Fees Query',
      query: "Students with pending fees",
      expectedAgent: ['COLLECTIVE_FEE'],
      expectedTextSnippet: "Students With Outstanding Fees",
    },
    {
      id: 'TEST 12: General Assistance / Capabilities',
      query: "What can you do?",
      expectedAgent: ['MISC'],
      expectedTextSnippet: "GRADit Assistant Capabilities",
    },
  ];

  for (const t of testCases) {
    console.log('----------------------------------------------------------------');
    console.log(`🔹 [${t.id}]`);
    console.log(`   Query: "${t.query}"`);
    console.log('----------------------------------------------------------------');
    const res = await OrchestratorAgent.processQuery(t.query);
    console.log(`   Routed Agent: ${res.agent}`);
    console.log(`   Response Preview:\n${res.text.split('\n').slice(0, 4).join('\n')}\n   ...`);
    if (res.quickActions && res.quickActions.length > 0) {
      console.log(`   Quick Action Chips (${res.quickActions.length}): ${res.quickActions.map(a => `[${a.label}]`).join(' ')}`);
    }

    const agentMatch = t.expectedAgent.includes(res.agent);
    console.log(`   Agent Routing Check: ${agentMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log('\n');
  }
}

runTestSuite().catch(err => console.error('Suite execution error:', err));
