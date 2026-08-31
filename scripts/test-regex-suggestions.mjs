import { StudentService } from '../src/backend/services/studentService.ts';

console.log('====================================================');
console.log('🧪 TESTING REGEX STUDENT CANDIDATE EXTRACTION');
console.log('====================================================');

const testQueries = [
  "What is Rahul's attendance?",
  "What is Rahul Sharma's attendance?",
  "Check attendance for 2025CSE019",
  "Show fee for ST-101",
  "Tell me the attendance details of Priya Narayanan as PDF",
  "What is the fee status of Aditya Sharma for odd sem?",
  "List all students named Rahul",
];

for (const q of testQueries) {
  const candidates = StudentService.extractCandidates(q);
  console.log(`Query: "${q}"`);
  console.log(`Extracted Candidates: [${candidates.map(c => `"${c}"`).join(', ')}]`);
  console.log('----------------------------------------------------');
}
