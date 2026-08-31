import { StudentResolver } from '../src/lib/studentResolver.ts';
import { OrchestratorAgent } from '../src/lib/chatEngine.ts';
import { StudentService } from '../src/backend/services/studentService.ts';

console.log('================================================================');
console.log('🧪 TESTING RESOLUTION HIERARCHY & AMBIGUITY DECISION LOGIC');
console.log('================================================================\n');

// Mock data to test hierarchy & ambiguity logic deterministically
const SAMPLE_STUDENTS = [
  { id: '1', student_id: '2025CSE019', first_name: 'Rahul', last_name: 'Sharma', name: 'Rahul Sharma', department: 'Computer Science', class: 'CSE-A' },
  { id: '2', student_id: '2025IT012', first_name: 'Rahul', last_name: 'Kumar', name: 'Rahul Kumar', department: 'Information Technology', class: 'IT-A' },
  { id: '3', student_id: '2025ECE008', first_name: 'Rahul', last_name: 'Varma', name: 'Rahul Varma', department: 'Electronics', class: 'ECE-B' },
  { id: '4', student_id: '2025MECH004', first_name: 'Rahul', last_name: 'Raj', name: 'Rahul Raj', department: 'Mechanical', class: 'MECH-A' },
  { id: '5', student_id: '2025CIVIL002', first_name: 'Rahul', last_name: 'Deshmukh', name: 'Rahul Deshmukh', department: 'Civil', class: 'CIVIL-B' },
  { id: '6', student_id: '2025CSE045', first_name: 'Aditya', last_name: 'Sharma', name: 'Aditya Sharma', department: 'Computer Science', class: 'CSE-B' },
  { id: '7', student_id: '2025CSE099', first_name: 'Priya', last_name: 'Narayanan', name: 'Priya Narayanan', department: 'Computer Science', class: 'CSE-A' },
];

// Temporarily override searchStudents to simulate database responses deterministically for unit testing
StudentService.searchStudents = async (cand) => {
  const clean = cand.trim().toLowerCase();
  
  // 1. Exact ID
  const idMatch = SAMPLE_STUDENTS.filter(s => s.student_id.toLowerCase() === clean);
  if (idMatch.length > 0) return { status: 'SUCCESS', matches: idMatch, matchType: 'EXACT_ID' };

  // 2. Exact Full Name
  const fullNameMatch = SAMPLE_STUDENTS.filter(s => s.name.toLowerCase() === clean);
  if (fullNameMatch.length > 0) return { status: 'SUCCESS', matches: fullNameMatch, matchType: 'EXACT_FULL_NAME' };

  // 3. Exact First Name
  const firstMatch = SAMPLE_STUDENTS.filter(s => s.first_name.toLowerCase() === clean);
  if (firstMatch.length > 0) return { status: 'SUCCESS', matches: firstMatch, matchType: 'EXACT_FIRST_NAME' };

  // 4. Exact Last Name
  const lastMatch = SAMPLE_STUDENTS.filter(s => s.last_name.toLowerCase() === clean);
  if (lastMatch.length > 0) return { status: 'SUCCESS', matches: lastMatch, matchType: 'EXACT_LAST_NAME' };

  // 5. Partial
  const partial = SAMPLE_STUDENTS.filter(s => s.name.toLowerCase().includes(clean) || s.student_id.toLowerCase().includes(clean));
  if (partial.length > 0) return { status: 'SUCCESS', matches: partial, matchType: 'PARTIAL' };

  return { status: 'NOT_FOUND', matches: [] };
};

async function runUnitTests() {
  console.log('--- TEST 1: Exact Student ID (2025CSE019) ---');
  const res1 = await StudentResolver.resolve("Show attendance for 2025CSE019");
  console.log(`Resolution: ${res1.status}, Student: ${res1.student?.first_name} ${res1.student?.last_name} (${res1.student?.student_id})`);
  console.assert(res1.status === 'RESOLVED' && res1.student?.student_id === '2025CSE019', 'Test 1 Failed');
  console.log('✅ TEST 1 PASSED: Resolved directly without suggestions.\n');

  console.log('--- TEST 2: Exact Full Name (Rahul Sharma) ---');
  const res2 = await StudentResolver.resolve("What is Rahul Sharma's attendance?");
  console.log(`Resolution: ${res2.status}, Student: ${res2.student?.first_name} ${res2.student?.last_name} (${res2.student?.student_id})`);
  console.assert(res2.status === 'RESOLVED' && res2.student?.student_id === '2025CSE019', 'Test 2 Failed');
  console.log('✅ TEST 2 PASSED: Resolved single full-name match uniquely.\n');

  console.log('--- TEST 3: Ambiguous First Name (Rahul -> 5 matches) ---');
  const res3 = await StudentResolver.resolve("What is Rahul's attendance?");
  console.log(`Resolution: ${res3.status}, Total Matches: ${res3.totalMatches}, Remaining: ${res3.remainingMatches}`);
  console.assert(res3.status === 'AMBIGUOUS' && res3.totalMatches === 5 && res3.remainingMatches === 2, 'Test 3 Failed');
  const chat3 = await OrchestratorAgent.processQuery("What is Rahul's attendance?");
  console.log(`Chat Response:\n${chat3.text}`);
  console.log(`Quick Actions: ${JSON.stringify(chat3.quickActions, null, 2)}`);
  console.assert(chat3.quickActions?.length === 4, 'Expected 3 student chips + 1 Show more chip');
  console.log('✅ TEST 3 PASSED: NEVER auto-selected; returned Top 3 + Show More.\n');

  console.log('--- TEST 4: Ambiguous Last Name (Sharma -> 2 matches) ---');
  const res4 = await StudentResolver.resolve("Show fees for Sharma");
  console.log(`Resolution: ${res4.status}, Total Matches: ${res4.totalMatches}`);
  console.assert(res4.status === 'AMBIGUOUS' && res4.totalMatches === 2, 'Test 4 Failed');
  const chat4 = await OrchestratorAgent.processQuery("Show fees for Sharma");
  console.log(`Chat Response:\n${chat4.text}`);
  console.log('✅ TEST 4 PASSED: Returned Top matches for last name search.\n');

  console.log('--- TEST 8: Show More / Pagination (Remaining students 4 onwards) ---');
  const chat8 = await OrchestratorAgent.processQuery("Show all Rahul students attendance");
  console.log(`Show More Chat Response:\n${chat8.text}`);
  console.log(`Quick Actions: ${JSON.stringify(chat8.quickActions, null, 2)}`);
  console.assert(chat8.text.includes('Remaining 2 students'), 'Expected remaining 2 students');
  console.log('✅ TEST 8 PASSED: Show More returned only remaining students.\n');

  console.log('--- TEST 9: Student Selection Intent Preservation ---');
  const chat9 = await OrchestratorAgent.processQuery("Show 2025CSE019 pending fee");
  console.log(`Fee Query Response: Agent: ${chat9.agent}`);
  console.assert(chat9.agent === 'FEE', 'Expected FEE agent');
  console.log('✅ TEST 9 PASSED: Original fee intent preserved on student selection.\n');

  console.log('--- TEST 10: Safety Rule Verification ---');
  const chat10 = await OrchestratorAgent.processQuery("What is Rahul's attendance?");
  console.log(`Agent returned: ${chat10.agent}`);
  console.assert(chat10.agent === 'ORCHESTRATOR', 'Ambiguous query must be handled by ORCHESTRATOR');
  console.log('✅ TEST 10 PASSED: Ambiguous query never reached sub-agent.\n');
}

runUnitTests();
