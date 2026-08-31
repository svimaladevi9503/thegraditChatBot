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

const { StudentService } = await import('../src/backend/services/studentService.ts');
const { StudentResolver } = await import('../src/lib/studentResolver.ts');
const { OrchestratorAgent } = await import('../src/lib/chatEngine.ts');

console.log('================================================================');
console.log('🧪 PHASE 2.5 — STUDENT RESOLUTION SAFETY & AMBIGUITY TEST SUITE');
console.log('================================================================\n');

async function runSuite() {
  const tests = [
    {
      id: 'TEST 1: Exact Student ID',
      query: 'Show attendance for 2025CSE019',
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        console.log(`Status: ${rawRes.status}`);
        console.log(`Agent: ${res.agent}`);
        console.log(`Response Text:\n${res.text}`);
        console.log(`Quick Actions: ${res.quickActions ? res.quickActions.length : 0}`);
      }
    },
    {
      id: 'TEST 2: Exact Full Name',
      query: "What is Rahul Sharma's attendance?",
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        console.log(`Status: ${rawRes.status}`);
        console.log(`Agent: ${res.agent}`);
        console.log(`Response Text:\n${res.text}`);
      }
    },
    {
      id: 'TEST 3: Ambiguous First Name',
      query: "What is Rahul's attendance?",
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        console.log(`Status: ${rawRes.status}`);
        console.log(`Agent: ${res.agent}`);
        console.log(`Response Text:\n${res.text}`);
        if (res.quickActions) {
          console.log(`Chips: ${JSON.stringify(res.quickActions, null, 2)}`);
        }
      }
    },
    {
      id: 'TEST 4: Ambiguous Last Name',
      query: 'Show fees for Sharma',
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        console.log(`Status: ${rawRes.status}`);
        console.log(`Agent: ${res.agent}`);
        console.log(`Response Text:\n${res.text}`);
        if (res.quickActions) {
          console.log(`Chips: ${JSON.stringify(res.quickActions, null, 2)}`);
        }
      }
    },
    {
      id: 'TEST 5: Unknown Student',
      query: "What is John Doe's attendance?",
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        console.log(`Status: ${rawRes.status}`);
        console.log(`Agent: ${res.agent}`);
        console.log(`Response Text:\n${res.text}`);
      }
    },
    {
      id: 'TEST 6: Possessive Query Extraction',
      query: "Rahul Sharma's pending fees",
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        const cands = StudentService.extractCandidates(res.query);
        console.log(`Extracted Candidates: ${JSON.stringify(cands)}`);
        console.log(`Resolution Status: ${rawRes.status}`);
      }
    },
    {
      id: 'TEST 7: Natural Language Noise Extraction',
      query: 'Can you please check the attendance of Rahul Sharma for me?',
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        const cands = StudentService.extractCandidates(res.query);
        console.log(`Extracted Candidates: ${JSON.stringify(cands)}`);
        console.log(`Resolution Status: ${rawRes.status}`);
      }
    },
    {
      id: 'TEST 8: Show More / Pagination',
      query: 'Show all Rahul students attendance',
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        console.log(`Status: ${rawRes.status}`);
        console.log(`Response Text:\n${res.text}`);
        if (res.quickActions) {
          console.log(`Chips: ${JSON.stringify(res.quickActions, null, 2)}`);
        }
      }
    },
    {
      id: 'TEST 9: Student Selection Intent Preservation',
      query: 'Show 2025CSE019 pending fee',
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        console.log(`Agent: ${res.agent}`);
        console.log(`Response Text:\n${res.text}`);
      }
    },
    {
      id: 'TEST 10: Safety Rule Verification',
      query: "What is Rahul's attendance?",
      validate: (res, rawRes) => {
        console.log(`Query: "${res.query}"`);
        console.log(`Resolver Status: ${rawRes.status}`);
        console.log(`Agent Handled: ${res.agent}`);
        const passed = (rawRes.status === 'AMBIGUOUS' ? res.agent === 'ORCHESTRATOR' : true);
        console.log(`Safety Check (Ambiguous Never Reached Sub-Agent): ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      }
    }
  ];

  for (const t of tests) {
    console.log('----------------------------------------------------------------');
    console.log(`🔹 [${t.id}]`);
    console.log('----------------------------------------------------------------');
    const rawRes = await StudentResolver.resolve(t.query);
    const chatRes = await OrchestratorAgent.processQuery(t.query);
    t.validate({ ...chatRes, query: t.query }, rawRes);
    console.log('\n');
  }
}

runSuite().catch(err => console.error('Suite error:', err));
