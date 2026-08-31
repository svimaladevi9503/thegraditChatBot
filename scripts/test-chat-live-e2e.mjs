const PORT = process.env.PORT || 3000;
const API_URL = `http://localhost:${PORT}/api/chat`;

console.log('================================================================');
console.log('🌐 PHASE 3.2 — CRITICAL LIVE E2E CHATBOT API VERIFICATION');
console.log(`Target endpoint: ${API_URL}`);
console.log('================================================================\n');

const testCases = [
  // INDIVIDUAL
  {
    category: 'INDIVIDUAL',
    query: "What is Rahul's attendance?",
  },
  {
    category: 'INDIVIDUAL',
    query: "attendance for rahul",
  },
  {
    category: 'INDIVIDUAL',
    query: "What is Rahul's pending fee?",
  },
  {
    category: 'INDIVIDUAL',
    query: "Show fee for Rahul",
  },
  {
    category: 'INDIVIDUAL',
    query: "Show attendance for 2025CSE019",
  },

  // COLLECTIVE
  {
    category: 'COLLECTIVE',
    query: "Show pending fees",
  },
  {
    category: 'COLLECTIVE',
    query: "Total fees collected",
  },
  {
    category: 'COLLECTIVE',
    query: "Overall attendance",
  },
  {
    category: 'COLLECTIVE',
    query: "Students below 75% attendance",
  },

  // EDGE CASES
  {
    category: 'EDGE_CASE',
    query: "John Doe attendance",
  },
  {
    category: 'EDGE_CASE',
    query: "INVALID_STUDENT_999 fee",
  },
];

async function runE2ETests() {
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const t = testCases[i];
    console.log(`================================================================`);
    console.log(`TEST ${i + 1} [${t.category}]: "${t.query}"`);
    console.log(`================================================================`);

    try {
      const startTime = Date.now();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: t.query, userId: 'st-00' }),
      });

      const elapsed = Date.now() - startTime;
      const json = await res.json();

      console.log(`HTTP Status: ${res.status} (${elapsed}ms)`);
      console.log(`ROUTED AGENT: ${json.agent}`);
      console.log(`RESOLUTION STATUS: ${json.resolutionStatus || (t.category === 'COLLECTIVE' ? 'BYPASSED' : 'N/A')}`);
      console.log(`API SUCCESS: ${json.success}`);
      console.log(`ERROR TYPE: ${json.errorType || 'none'}`);
      console.log(`SUGGESTION COUNT: ${(json.suggestions || json.quickActions || []).length}`);
      console.log(`RESPONSE:\n${json.text}`);
      console.log(`----------------------------------------------------------------\n`);
      passedCount++;
    } catch (err) {
      console.error(`❌ Request Failed for "${t.query}":`, err.message);
      console.log(`----------------------------------------------------------------\n`);
    }
  }

  console.log('================================================================');
  console.log(`🏁 COMPLETED ${passedCount} / ${testCases.length} LIVE API CALLS`);
  console.log('================================================================');
}

runE2ETests().catch(err => console.error('E2E Suite error:', err));
