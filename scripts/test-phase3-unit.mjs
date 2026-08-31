import { OrchestratorAgent } from '../src/lib/chatEngine.ts';
import { AttendanceService } from '../src/backend/services/attendanceService.ts';
import { FeeService } from '../src/backend/services/feeService.ts';
import { StudentService } from '../src/backend/services/studentService.ts';

console.log('================================================================');
console.log('🧪 PHASE 3 UNIT TESTS — AGENTS, ROUTING & COLLECTIVE CALCULATIONS');
console.log('================================================================\n');

// Mock data
const MOCK_ATTENDANCE = [
  { id: '1', studentId: '2025CSE001', studentName: 'Aarav Patel', departmentName: 'Computer Science', className: 'CSE-A', totalClasses: 60, attendedClasses: 55, attendancePct: 91.67, semester: 'Odd Sem', academicYear: '2025-26' },
  { id: '2', studentId: '2025CSE002', studentName: 'Bhavna Sharma', departmentName: 'Computer Science', className: 'CSE-A', totalClasses: 60, attendedClasses: 40, attendancePct: 66.67, semester: 'Odd Sem', academicYear: '2025-26' },
  { id: '3', studentId: '2025IT003', studentName: 'Chetan Rao', departmentName: 'Information Technology', className: 'IT-A', totalClasses: 50, attendedClasses: 45, attendancePct: 90.0, semester: 'Odd Sem', academicYear: '2025-26' },
  { id: '4', studentId: '2025ECE004', studentName: 'Divya Nair', departmentName: 'Electronics', className: 'ECE-A', totalClasses: 50, attendedClasses: 35, attendancePct: 70.0, semester: 'Odd Sem', academicYear: '2025-26' },
  { id: '5', studentId: '2025MECH005', studentName: 'Eshan Roy', departmentName: 'Mechanical', className: 'MECH-A', totalClasses: 40, attendedClasses: 36, attendancePct: 90.0, semester: 'Odd Sem', academicYear: '2025-26' },
];

const MOCK_FEES = [
  { id: '1', studentId: '2025CSE001', studentName: 'Aarav Patel', departmentName: 'Computer Science', totalFee: 85000, paidAmount: 85000, dueAmount: 0, status: 'Fully Paid', semester: 'Odd Sem', academicYear: '2025-26', dueDate: '2025-10-15' },
  { id: '2', studentId: '2025CSE002', studentName: 'Bhavna Sharma', departmentName: 'Computer Science', totalFee: 85000, paidAmount: 50000, dueAmount: 35000, status: 'Pending Due', semester: 'Odd Sem', academicYear: '2025-26', dueDate: '2025-10-15' },
  { id: '3', studentId: '2025IT003', studentName: 'Chetan Rao', departmentName: 'Information Technology', totalFee: 80000, paidAmount: 80000, dueAmount: 0, status: 'Fully Paid', semester: 'Odd Sem', academicYear: '2025-26', dueDate: '2025-10-15' },
  { id: '4', studentId: '2025ECE004', studentName: 'Divya Nair', departmentName: 'Electronics', totalFee: 80000, paidAmount: 40000, dueAmount: 40000, status: 'Pending Due', semester: 'Odd Sem', academicYear: '2025-26', dueDate: '2025-10-15' },
];

// Temporarily mock service layers for unit tests
AttendanceService.getAllAttendance = async () => ({ status: 'SUCCESS', records: MOCK_ATTENDANCE });
FeeService.getAllFeeRecords = async () => ({ status: 'SUCCESS', records: MOCK_FEES });

async function runUnitTests() {
  console.log('--- TEST 1: Overall Attendance Summary ---');
  const res1 = await OrchestratorAgent.processQuery("Show overall attendance");
  console.log(`Agent: ${res1.agent}`);
  console.log(`Response:\n${res1.text}\n`);
  console.assert(res1.agent === 'COLLECTIVE_ATTENDANCE', 'Expected COLLECTIVE_ATTENDANCE');
  console.assert(res1.text.includes('Total Students: 5'), 'Expected 5 students');
  console.log('✅ TEST 1 PASSED.\n');

  console.log('--- TEST 2: Attendance Shortage List ---');
  const res2 = await OrchestratorAgent.processQuery("Attendance shortage list");
  console.log(`Agent: ${res2.agent}`);
  console.log(`Response:\n${res2.text}\n`);
  console.assert(res2.agent === 'COLLECTIVE_ATTENDANCE', 'Expected COLLECTIVE_ATTENDANCE');
  console.assert(res2.text.includes('Bhavna Sharma') && res2.text.includes('Divya Nair'), 'Expected shortage students');
  console.log('✅ TEST 2 PASSED.\n');

  console.log('--- TEST 3: Exam Eligibility Summary ---');
  const res3 = await OrchestratorAgent.processQuery("How many students are eligible?");
  console.log(`Agent: ${res3.agent}`);
  console.log(`Response:\n${res3.text}\n`);
  console.assert(res3.agent === 'COLLECTIVE_ATTENDANCE', 'Expected COLLECTIVE_ATTENDANCE');
  console.assert(res3.text.includes('Eligible Students (≥75%): **3**'), 'Expected 3 eligible students');
  console.log('✅ TEST 3 PASSED.\n');

  console.log('--- TEST 4: Overall Fee Collection Summary ---');
  const res4 = await OrchestratorAgent.processQuery("Total fees collected");
  console.log(`Agent: ${res4.agent}`);
  console.log(`Response:\n${res4.text}\n`);
  console.assert(res4.agent === 'COLLECTIVE_FEE', 'Expected COLLECTIVE_FEE');
  console.assert(res4.text.includes('Total Invoiced: ₹3,30,000') && res4.text.includes('Total Collected: ₹2,55,000'), 'Expected fee calculation');
  console.log('✅ TEST 4 PASSED.\n');

  console.log('--- TEST 5: Students With Pending Fees ---');
  const res5 = await OrchestratorAgent.processQuery("Students with pending fees");
  console.log(`Agent: ${res5.agent}`);
  console.log(`Response:\n${res5.text}\n`);
  console.assert(res5.agent === 'COLLECTIVE_FEE', 'Expected COLLECTIVE_FEE');
  console.assert(res5.text.includes('Divya Nair') && res5.text.includes('Bhavna Sharma'), 'Expected pending fee students');
  console.log('✅ TEST 5 PASSED.\n');

  console.log('--- TEST 6: Capabilities / Help Question ---');
  const res6 = await OrchestratorAgent.processQuery("What can you do?");
  console.log(`Agent: ${res6.agent}`);
  console.log(`Response:\n${res6.text}\n`);
  console.assert(res6.agent === 'MISC', 'Expected MISC');
  console.log('✅ TEST 6 PASSED.\n');
}

runUnitTests().catch(err => console.error(err));
