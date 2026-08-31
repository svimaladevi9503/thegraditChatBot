import { supabase, supabaseAdmin, isSupabaseConfigured } from '../supabaseClient';
import { ATTENDANCE_RECORDS, AttendanceRecord } from '../../lib/mockDatabase';
import { QueryStatus } from './studentService';

export interface StudentAttendanceSummaryRow {
  student_id: string;
  first_name: string;
  last_name: string;
  department_code?: string;
  department_name?: string;
  class_name?: string;
  section?: string;
  semester?: string;
  academic_year?: string;
  total_classes: number;
  attended_classes: number;
  attendance_percentage: number;
}

export interface AttendanceQueryResult {
  status: QueryStatus;
  record: AttendanceRecord | null;
  errorMessage?: string;
}

const useDemoData = process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true';

export class AttendanceService {
  /**
   * Fetch all attendance records
   */
  public static async getAllAttendance(): Promise<{ status: QueryStatus; records: AttendanceRecord[] }> {
    const client = supabaseAdmin || supabase;
    if (!isSupabaseConfigured() || !client) {
      if (useDemoData) return { status: 'SUCCESS', records: ATTENDANCE_RECORDS };
      return { status: 'CONNECTION_ERROR', records: [] };
    }

    try {
      const { data: viewData, error: viewErr } = await client
        .from('student_attendance_summary')
        .select('*');

      if (!viewErr && viewData && viewData.length > 0) {
        return {
          status: 'SUCCESS',
          records: viewData.map((d: StudentAttendanceSummaryRow) => ({
            id: `att-${d.student_id}`,
            studentId: d.student_id,
            studentName: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Student',
            course: d.class_name || d.department_name || d.department_code || 'B.E. CSE',
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || '2025-26',
            subject: d.department_name ? `${d.department_name} Core` : 'Engineering Modules',
            totalClasses: Number(d.total_classes || 60),
            attendedClasses: Number(d.attended_classes || 0),
            attendancePct: Number(d.attendance_percentage || 0),
          }))
        };
      }

      if (viewErr) {
        if (useDemoData) return { status: 'SUCCESS', records: ATTENDANCE_RECORDS };
        return { status: 'CONNECTION_ERROR', records: [] };
      }

      if (useDemoData) return { status: 'SUCCESS', records: ATTENDANCE_RECORDS };
      return { status: 'NOT_FOUND', records: [] };
    } catch (err) {
      if (useDemoData) return { status: 'SUCCESS', records: ATTENDANCE_RECORDS };
      return { status: 'CONNECTION_ERROR', records: [] };
    }
  }

  /**
   * Get attendance for a specific student with status
   */
  public static async getStudentAttendanceDetailed(studentId?: string, studentName?: string): Promise<AttendanceQueryResult> {
    const client = supabaseAdmin || supabase;
    if (!isSupabaseConfigured() || !client) {
      if (useDemoData) return this.getDemoAttendance(studentId, studentName);
      return { status: 'CONNECTION_ERROR', record: null, errorMessage: "I'm unable to access student records right now. Please try again." };
    }

    if (!studentId && !studentName) {
      return { status: 'NOT_FOUND', record: null };
    }

    try {
      let query = client.from('student_attendance_summary').select('*');
      if (studentId) {
        query = query.eq('student_id', studentId);
      } else if (studentName) {
        const first = studentName.split(' ')[0];
        query = query.or(`first_name.ilike.%${first}%,last_name.ilike.%${first}%,student_id.ilike.%${studentName}%`);
      }

      const { data, error } = await query.limit(1);
      if (error) {
        if (useDemoData) return this.getDemoAttendance(studentId, studentName);
        return { status: 'CONNECTION_ERROR', record: null, errorMessage: "I'm unable to access student records right now. Please try again." };
      }

      if (data && data.length > 0) {
        const d: StudentAttendanceSummaryRow = data[0];
        return {
          status: 'SUCCESS',
          record: {
            id: `att-${d.student_id}`,
            studentId: d.student_id,
            studentName: `${d.first_name || ''} ${d.last_name || ''}`.trim() || studentName || 'Student',
            course: d.class_name || d.department_name || 'B.E. CSE',
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || '2025-26',
            subject: 'Computer Networks & Core Systems',
            totalClasses: Number(d.total_classes || 60),
            attendedClasses: Number(d.attended_classes || 0),
            attendancePct: Number(d.attendance_percentage || 0),
          }
        };
      }

      if (useDemoData) return this.getDemoAttendance(studentId, studentName);
      return { status: 'NOT_FOUND', record: null };
    } catch (err) {
      if (useDemoData) return this.getDemoAttendance(studentId, studentName);
      return { status: 'CONNECTION_ERROR', record: null, errorMessage: "I'm unable to access student records right now. Please try again." };
    }
  }

  public static async getStudentAttendance(studentId?: string, studentName?: string): Promise<AttendanceRecord | null> {
    const res = await this.getStudentAttendanceDetailed(studentId, studentName);
    return res.record;
  }

  private static getDemoAttendance(studentId?: string, studentName?: string): AttendanceQueryResult {
    const all = ATTENDANCE_RECORDS;
    if (studentId) {
      const match = all.find(r => r.studentId === studentId);
      if (match) return { status: 'SUCCESS', record: match };
    }
    if (studentName) {
      const clean = studentName.toLowerCase();
      const match = all.find(r => r.studentName.toLowerCase().includes(clean));
      if (match) return { status: 'SUCCESS', record: match };
    }
    return { status: 'NOT_FOUND', record: null };
  }

  /**
   * Get aggregate attendance records for class or department
   */
  public static async getAggregateAttendance(courseOrDept?: string): Promise<{
    status: QueryStatus;
    records: AttendanceRecord[];
    avgPercentage: string;
    totalClasses: number;
    attendedClasses: number;
    eligibleCount: number;
    shortageCount: number;
  }> {
    const { status, records: all } = await this.getAllAttendance();
    const filtered = courseOrDept 
      ? all.filter(r => r.course.toLowerCase().includes(courseOrDept.toLowerCase()))
      : all;

    const totalClasses = filtered.reduce((acc, r) => acc + r.totalClasses, 0);
    const attendedClasses = filtered.reduce((acc, r) => acc + r.attendedClasses, 0);
    const avgPercentage = totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(2) : '0.00';
    const eligibleCount = filtered.filter(r => r.attendancePct >= 75.0).length;
    const shortageCount = filtered.length - eligibleCount;

    return {
      status,
      records: filtered,
      avgPercentage,
      totalClasses,
      attendedClasses,
      eligibleCount,
      shortageCount,
    };
  }
}
