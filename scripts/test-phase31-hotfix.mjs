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
console.log('🧪 PHASE 3.1 HOTFIX VERIFICATION — MANDATORY ROUTING MATRIX');
console.log('================================================================\n');

// Spy on StudentResolver.resolve
let studentResolverCallCount = 0;
const originalResolve = StudentResolver.resolve;
StudentResolver.resolve = async (q) => {
  studentResolverCallCount++;
  return originalResolve.call(StudentResolver, q);
};

const matrix = [
  {
    query: "Show pending fees",
    expectedIntent: "COLLECTIVE_FEE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_FEE",
  },
  {
    query: "How much fee is pending?",
    expectedIntent: "COLLECTIVE_FEE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_FEE",
  },
  {
    query: "Total fees collected",
    expectedIntent: "COLLECTIVE_FEE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_FEE",
  },
  {
    query: "Overall attendance",
    expectedIntent: "COLLECTIVE_ATTENDANCE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_ATTENDANCE",
  },
  {
    query: "Students below 75% attendance",
    expectedIntent: "COLLECTIVE_ATTENDANCE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_ATTENDANCE",
  },
  {
    query: "What is Rahul's attendance?",
    expectedIntent: "INDIVIDUAL_ATTENDANCE",
    expectedResolver: true,
    expectedAgent: ["ATTENDANCE", "ORCHESTRATOR"],
  },
  {
    query: "What is Rahul's pending fee?",
    expectedIntent: "INDIVIDUAL_FEE",
    expectedResolver: true,
    expectedAgent: ["FEE", "ORCHESTRATOR"],
  },
  {
    query: "Show attendance for 2025CSE019",
    expectedIntent: "INDIVIDUAL_ATTENDANCE",
    expectedResolver: true,
    expectedAgent: ["ATTENDANCE", "ORCHESTRATOR"],
  },
  {
    query: "Show fee for 2025CSE019",
    expectedIntent: "INDIVIDUAL_FEE",
    expectedResolver: true,
    expectedAgent: ["FEE", "ORCHESTRATOR"],
  },
  {
    query: "Show attendance summary",
    expectedIntent: "COLLECTIVE_ATTENDANCE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_ATTENDANCE",
  },
  {
    query: "Attendance shortage list",
    expectedIntent: "COLLECTIVE_ATTENDANCE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_ATTENDANCE",
  },
  {
    query: "How many students are eligible?",
    expectedIntent: "COLLECTIVE_ATTENDANCE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_ATTENDANCE",
  },
  {
    query: "Overall fee collection",
    expectedIntent: "COLLECTIVE_FEE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_FEE",
  },
  {
    query: "Students with pending fees",
    expectedIntent: "COLLECTIVE_FEE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_FEE",
  },
  {
    query: "Fee collection summary",
    expectedIntent: "COLLECTIVE_FEE",
    expectedResolver: false,
    expectedAgent: "COLLECTIVE_FEE",
  }
];

let allPassed = true;

for (let i = 0; i < matrix.length; i++) {
  const t = matrix[i];
  studentResolverCallCount = 0;
  
  const candidates = StudentService.extractCandidates(t.query);
  const intent = OrchestratorAgent.classifyIntent(t.query, candidates);
  const response = await OrchestratorAgent.processQuery(t.query);
  const resolverCalled = studentResolverCallCount > 0;

  const intentOk = intent === t.expectedIntent;
  const resolverOk = resolverCalled === t.expectedResolver;
  const agentOk = Array.isArray(t.expectedAgent) 
    ? t.expectedAgent.includes(response.agent) 
    : response.agent === t.expectedAgent;

  const passed = intentOk && resolverOk && agentOk;
  if (!passed) allPassed = false;

  console.log(`[TEST ${i + 1}] "${t.query}"`);
  console.log(`  Intent: ${intent} (Expected: ${t.expectedIntent}) -> ${intentOk ? '✅' : '❌'}`);
  console.log(`  StudentResolver Called: ${resolverCalled} (Expected: ${t.expectedResolver}) -> ${resolverOk ? '✅' : '❌'}`);
  console.log(`  Routed Agent: ${response.agent} (Expected: ${t.expectedAgent}) -> ${agentOk ? '✅' : '❌'}`);
  console.log(`  Result Preview: ${response.text.split('\n')[0]}`);
  console.log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
}

console.log('================================================================');
if (allPassed) {
  console.log('🎉 ALL 15 MANDATORY INTENT MATRIX TESTS PASSED PERFECTLY!');
} else {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
}
console.log('================================================================');
