import { StudentService } from '../src/backend/services/studentService.js';
import { AttendanceService } from '../src/backend/services/attendanceService.js';
import { FeeService } from '../src/backend/services/feeService.js';
import { OrchestratorAgent } from '../src/lib/chatEngine.js';
import { checkSupabaseHealth } from '../src/backend/supabaseClient.js';

// We can also test through the running Next.js HTTP API
async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 GRADit! Multi-Agent & Backend Verification Suite');
  console.log('====================================================\n');

  // Test 0: Connection Health Check
  console.log('--- Test 0: Health Check ---');
  try {
    const health = await checkSupabaseHealth();
    console.log('Health Status:', health.status);
    console.log('Latency:', health.latencyMs + 'ms');
    console.log('Verified Tables:', health.tablesVerified);
  } catch (e) {
    console.log('Health check note:', e.message);
  }

  // Test 1: Find student by first name
  console.log('\n--- Test 1: Find Student by First Name ("Rahul") ---');
  const student = await StudentService.findStudent('Rahul');
  console.log('Student found:', student);

  // Test 2: Retrieve student attendance
  console.log('\n--- Test 2: Retrieve Student Attendance ("Rahul") ---');
  const att = await AttendanceService.getStudentAttendance(undefined, 'Rahul');
  console.log('Attendance:', att);

  // Test 3: Retrieve student fees & calculate pending amount
  console.log('\n--- Test 3: Retrieve Student Fees ("Rahul") ---');
  const fee = await FeeService.getStudentFee(undefined, 'Rahul');
  console.log('Fee details:', fee);
  console.log(`Calculated: Total = ₹${fee?.totalFee}, Paid = ₹${fee?.paidAmount}, Pending Due = ₹${fee?.dueAmount}`);

  // Test 4: Aggregate Attendance
  console.log('\n--- Test 4: Aggregate Attendance ---');
  const aggAtt = await AttendanceService.getAggregateAttendance();
  console.log(`Total Classes: ${aggAtt.totalClasses}, Average: ${aggAtt.avgPercentage}%, Eligible: ${aggAtt.eligibleCount}, Shortage: ${aggAtt.shortageCount}`);

  // Test 5: Aggregate Fees
  console.log('\n--- Test 5: Aggregate Fees ---');
  const aggFee = await FeeService.getAggregateFees();
  console.log(`Total Invoiced: ₹${aggFee.totalFee}, Collected: ₹${aggFee.paidAmount}, Due: ₹${aggFee.dueAmount}, Rate: ${aggFee.collectionRate}`);

  // Test 6: Full Orchestrator Query End-to-End
  console.log('\n--- Test 6: End-to-End Chat Query ("What is Rahul\'s attendance for 2025-26?") ---');
  const chatRes1 = await OrchestratorAgent.processQuery("What is Rahul's attendance for 2025-26?");
  console.log('Agent:', chatRes1.agent);
  console.log('Resolved Student:', chatRes1.resolvedStudent);
  console.log('Response Snippet:\n' + chatRes1.text.substring(0, 150) + '...');

  console.log('\n--- Test 7: End-to-End Chat Query ("What is Rahul\'s pending fee in pdf?") ---');
  const chatRes2 = await OrchestratorAgent.processQuery("What is Rahul's pending fee in pdf?");
  console.log('Agent:', chatRes2.agent);
  console.log('Export Format:', chatRes2.exportFormat);
  console.log('Has Export Payload:', Boolean(chatRes2.exportPayload));

  console.log('\n====================================================');
  console.log('✅ All test scenarios executed successfully!');
  console.log('====================================================');
}

runTestSuite();
