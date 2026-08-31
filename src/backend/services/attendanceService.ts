import { supabase, supabaseAdmin, isSupabaseConfigured } from '../supabaseClient';
import { ATTENDANCE_RECORDS, AttendanceRecord } from '../../lib/mockDatabase';

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

const useDemoData = process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true';

export class AttendanceService {
  /**
   * Fetch attendance records preferring the live `public.student_attendance_summary` view
   */
  public static async getAllAttendance(): Promise<AttendanceRecord[]> {
    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured() && client) {
      try {
        // 1. Primary: Prefer student_attendance_summary view
        const { data: viewData, error: viewErr } = await client
          .from('student_attendance_summary')
          .select('*');

        if (!viewErr && viewData && viewData.length > 0) {
          return viewData.map((d: StudentAttendanceSummaryRow) => ({
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
          }));
        }

        // 2. Secondary Table Query: public.attendance
        const { data: tblData, error: tblErr } = await client
          .from('attendance')
          .select('id, student_id, semester, academic_year, total_classes, attended_classes, created_at');

        if (!tblErr && tblData && tblData.length > 0) {
          return tblData.map((d: any) => ({
            id: String(d.id),
            studentId: d.student_id,
            studentName: `Student (${d.student_id})`,
            course: 'Department Cohort',
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || '2025-26',
            subject: 'Academic Session',
            totalClasses: Number(d.total_classes || 60),
            attendedClasses: Number(d.attended_classes || 0),
            attendancePct: d.total_classes ? Number(((d.attended_classes / d.total_classes) * 100).toFixed(2)) : 0,
          }));
        }
      } catch (err) {
        console.warn('AttendanceService: Supabase query error:', err);
      }
    }

    return useDemoData ? ATTENDANCE_RECORDS : [];
  }

  /**
   * Get attendance for a specific student ID or Name
   */
  public static async getStudentAttendance(studentId?: string, studentName?: string): Promise<AttendanceRecord | null> {
    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured() && client && (studentId || studentName)) {
      try {
        let query = client.from('student_attendance_summary').select('*');
        if (studentId) {
          query = query.eq('student_id', studentId);
        } else if (studentName) {
          const first = studentName.split(' ')[0];
          query = query.or(`first_name.ilike.%${first}%,last_name.ilike.%${first}%,student_id.ilike.%${studentName}%`);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          const d: StudentAttendanceSummaryRow = data[0];
          return {
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
          };
        }
      } catch (err) {
        console.warn('AttendanceService.getStudentAttendance: Supabase query error:', err);
      }
    }

    // Demo fallback ONLY if explicit flag enabled
    if (useDemoData) {
      const all = ATTENDANCE_RECORDS;
      if (studentId) {
        const match = all.find(r => r.studentId === studentId);
        if (match) return match;
      }
      if (studentName) {
        const clean = studentName.toLowerCase();
        const match = all.find(r => r.studentName.toLowerCase().includes(clean));
        if (match) return match;
      }
    }

    return null;
  }

  /**
   * Get aggregate attendance records for class or department
   */
  public static async getAggregateAttendance(courseOrDept?: string): Promise<{
    records: AttendanceRecord[];
    avgPercentage: string;
    totalClasses: number;
    attendedClasses: number;
    eligibleCount: number;
    shortageCount: number;
  }> {
    const all = await this.getAllAttendance();
    const filtered = courseOrDept 
      ? all.filter(r => r.course.toLowerCase().includes(courseOrDept.toLowerCase()))
      : all;

    const totalClasses = filtered.reduce((acc, r) => acc + r.totalClasses, 0);
    const attendedClasses = filtered.reduce((acc, r) => acc + r.attendedClasses, 0);
    const avgPercentage = totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(2) : '0.00';
    const eligibleCount = filtered.filter(r => r.attendancePct >= 75.0).length;
    const shortageCount = filtered.length - eligibleCount;

    return {
      records: filtered,
      avgPercentage,
      totalClasses,
      attendedClasses,
      eligibleCount,
      shortageCount,
    };
  }
}
