// =========================================================
// Technical Team College - Live Master Database
// Synchronized with the latest GRADit! Dashboard Visuals
// =========================================================

export interface Course {
  id: string;
  code: string;
  name: string;
  studentsCount: number;
  color: string;
}

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  gender: 'Male' | 'Female' | 'Not Specified';
  course: string;
  semester: string;
  academicYear: string;
  email: string;
  phone: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  semester: string;
  academicYear: string;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  dueDate: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  semester: string;
  academicYear: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  attendancePct: number;
}

// 1. Courses corresponding to chart in the reference image
export const COURSES_DATA: Course[] = [
  { id: '1', code: 'ARCH', name: 'Architecture', studentsCount: 65, color: '#3D82F6' },
  { id: '2', code: 'BCOM_ACC', name: 'B.Com Accounts', studentsCount: 78, color: '#10B981' },
  { id: '3', code: 'BCOM_FIN', name: 'B.Com Finance', studentsCount: 45, color: '#F59E0B' },
  { id: '4', code: 'BE_CSE', name: 'B.E. CSE', studentsCount: 95, color: '#EF4444' },
  { id: '5', code: 'BE_IT', name: 'B.E. IT', studentsCount: 38, color: '#8B5CF6' },
  { id: '6', code: 'CONST_MGT', name: 'Construction Management', studentsCount: 58, color: '#06B6D4' },
  { id: '7', code: 'MBA_HR', name: 'MBA. HR', studentsCount: 52, color: '#F97316' },
  { id: '8', code: 'MBA_EVS', name: 'MBA HR EVS', studentsCount: 48, color: '#14B8A6' },
  { id: '9', code: 'STAFF_G1', name: 'Staff Grp 1', studentsCount: 15, color: '#6366F1' },
];

// 2. Metrics matching top summary cards (Exactly as in the latest dashboard screenshot)
export const COLLEGE_METRICS = {
  collegeName: "Technical Team College",
  currentSem: "Odd",
  totalStaff: 35,
  totalStudents: 74,
  totalBoys: 36,
  totalGirls: 45,
  notSpecified: 28,
};

// 3. Students Sample Data with Rahul and other college students
export const STUDENTS_DATA: Student[] = [
  { id: 'st-00', rollNumber: '2025CSE019', name: 'Rahul Sharma', gender: 'Male', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', email: 'rahul.sharma@gradit.edu', phone: '+91 98765 11223' },
  { id: 'st-01', rollNumber: '2026CSE001', name: 'Aditya Sharma', gender: 'Male', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', email: 'aditya.s@gradit.edu', phone: '+91 98765 43210' },
  { id: 'st-02', rollNumber: '2026CSE002', name: 'Priya Narayanan', gender: 'Female', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', email: 'priya.n@gradit.edu', phone: '+91 98765 43211' },
  { id: 'st-03', rollNumber: '2026IT001', name: 'Rohan Varma', gender: 'Male', course: 'B.E. IT', semester: 'Odd Sem', academicYear: '2025-26', email: 'rohan.v@gradit.edu', phone: '+91 98765 43212' },
  { id: 'st-04', rollNumber: '2026ARC001', name: 'Sneha Kulkarni', gender: 'Female', course: 'Architecture', semester: 'Odd Sem', academicYear: '2025-26', email: 'sneha.k@gradit.edu', phone: '+91 98765 43213' },
  { id: 'st-05', rollNumber: '2026BCOM01', name: 'Karthik Raja', gender: 'Male', course: 'B.Com Accounts', semester: 'Odd Sem', academicYear: '2025-26', email: 'karthik.r@gradit.edu', phone: '+91 98765 43214' },
  { id: 'st-06', rollNumber: '2026MBA001', name: 'Ananya Deshmukh', gender: 'Female', course: 'MBA. HR', semester: 'Odd Sem', academicYear: '2025-26', email: 'ananya.d@gradit.edu', phone: '+91 98765 43215' },
  { id: 'st-07', rollNumber: '2026GEN001', name: 'Sam Taylor', gender: 'Not Specified', course: 'Construction Management', semester: 'Odd Sem', academicYear: '2025-26', email: 'sam.t@gradit.edu', phone: '+91 98765 43216' },
  { id: 'st-08', rollNumber: '2026CSE003', name: 'Vimaladevi S', gender: 'Female', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', email: 'vimaladevi@gradit.edu', phone: '+91 98765 43299' },
];

// 4. Comprehensive Fee Records
export const FEE_RECORDS: FeeRecord[] = [
  { id: 'fee-00', studentId: 'st-00', studentName: 'Rahul Sharma', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', totalFee: 85000, paidAmount: 85000, dueAmount: 0, status: 'PAID', dueDate: '2025-08-15' },
  { id: 'fee-01', studentId: 'st-01', studentName: 'Aditya Sharma', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', totalFee: 85000, paidAmount: 85000, dueAmount: 0, status: 'PAID', dueDate: '2025-08-15' },
  { id: 'fee-02', studentId: 'st-02', studentName: 'Priya Narayanan', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', totalFee: 85000, paidAmount: 50000, dueAmount: 35000, status: 'PARTIAL', dueDate: '2025-09-30' },
  { id: 'fee-03', studentId: 'st-03', studentName: 'Rohan Varma', course: 'B.E. IT', semester: 'Odd Sem', academicYear: '2025-26', totalFee: 80000, paidAmount: 0, dueAmount: 80000, status: 'PENDING', dueDate: '2025-09-15' },
  { id: 'fee-04', studentId: 'st-04', studentName: 'Sneha Kulkarni', course: 'Architecture', semester: 'Odd Sem', academicYear: '2025-26', totalFee: 95000, paidAmount: 95000, dueAmount: 0, status: 'PAID', dueDate: '2025-08-10' },
  { id: 'fee-05', studentId: 'st-05', studentName: 'Karthik Raja', course: 'B.Com Accounts', semester: 'Odd Sem', academicYear: '2025-26', totalFee: 60000, paidAmount: 30000, dueAmount: 30000, status: 'PARTIAL', dueDate: '2025-09-20' },
  { id: 'fee-06', studentId: 'st-06', studentName: 'Ananya Deshmukh', course: 'MBA. HR', semester: 'Odd Sem', academicYear: '2025-26', totalFee: 110000, paidAmount: 110000, dueAmount: 0, status: 'PAID', dueDate: '2025-08-01' },
  { id: 'fee-07', studentId: 'st-07', studentName: 'Sam Taylor', course: 'Construction Management', semester: 'Odd Sem', academicYear: '2025-26', totalFee: 75000, paidAmount: 15000, dueAmount: 60000, status: 'OVERDUE', dueDate: '2025-08-20' },
  { id: 'fee-08', studentId: 'st-08', studentName: 'Vimaladevi S', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', totalFee: 85000, paidAmount: 70000, dueAmount: 15000, status: 'PARTIAL', dueDate: '2025-09-25' },
];

// 5. Comprehensive Attendance Records (2025-26)
export const ATTENDANCE_RECORDS: AttendanceRecord[] = [
  { id: 'att-00', studentId: 'st-00', studentName: 'Rahul Sharma', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', subject: 'Computer Networks & Security', totalClasses: 64, attendedClasses: 56, attendancePct: 87.5 },
  { id: 'att-01', studentId: 'st-01', studentName: 'Aditya Sharma', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', subject: 'Advanced Algorithms', totalClasses: 60, attendedClasses: 54, attendancePct: 90.0 },
  { id: 'att-02', studentId: 'st-02', studentName: 'Priya Narayanan', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', subject: 'Distributed Systems', totalClasses: 58, attendedClasses: 51, attendancePct: 87.93 },
  { id: 'att-03', studentId: 'st-03', studentName: 'Rohan Varma', course: 'B.E. IT', semester: 'Odd Sem', academicYear: '2025-26', subject: 'Cloud Computing & DevOps', totalClasses: 62, attendedClasses: 42, attendancePct: 67.74 },
  { id: 'att-04', studentId: 'st-04', studentName: 'Sneha Kulkarni', course: 'Architecture', semester: 'Odd Sem', academicYear: '2025-26', subject: 'Urban Structural Design', totalClasses: 50, attendedClasses: 48, attendancePct: 96.0 },
  { id: 'att-05', studentId: 'st-05', studentName: 'Karthik Raja', course: 'B.Com Accounts', semester: 'Odd Sem', academicYear: '2025-26', subject: 'Corporate Financial Auditing', totalClasses: 55, attendedClasses: 46, attendancePct: 83.64 },
  { id: 'att-06', studentId: 'st-06', studentName: 'Ananya Deshmukh', course: 'MBA. HR', semester: 'Odd Sem', academicYear: '2025-26', subject: 'Strategic Organizational Behavior', totalClasses: 48, attendedClasses: 45, attendancePct: 93.75 },
  { id: 'att-07', studentId: 'st-07', studentName: 'Sam Taylor', course: 'Construction Management', semester: 'Odd Sem', academicYear: '2025-26', subject: 'BIM & Site Scheduling', totalClasses: 56, attendedClasses: 39, attendancePct: 69.64 },
  { id: 'att-08', studentId: 'st-08', studentName: 'Vimaladevi S', course: 'B.E. CSE', semester: 'Odd Sem', academicYear: '2025-26', subject: 'Deep Learning & NLP', totalClasses: 60, attendedClasses: 57, attendancePct: 95.0 },
];
