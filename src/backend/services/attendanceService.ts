import { getSupabaseServerClient, isSupabaseServerConfigured, getDatabaseAuthMode } from '../config/supabaseServer';
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

export interface AttendanceRecordItem {
  id: string;
  studentId: string;
  studentName: string;
  departmentCode?: string;
  departmentName?: string;
  className?: string;
  section?: string;
  semester: string;
  academicYear: string;
  totalClasses: number;
  attendedClasses: number;
  attendancePct: number;
}

export interface AttendanceQueryResult {
  status: QueryStatus;
  record: AttendanceRecordItem | null;
  errorMessage?: string;
}

export class AttendanceService {
  /**
   * Fetch all attendance records from public.student_attendance_summary
   */
  public static async getAllAttendance(): Promise<{ status: QueryStatus; records: AttendanceRecordItem[] }> {
    const client = getSupabaseServerClient();
    if (!isSupabaseServerConfigured() || !client) {
      console.log('[Supabase Diagnostic] Service: attendanceService Source: public.student_attendance_summary Status: ERROR Message: Client unavailable');
      return { status: 'CONNECTION_ERROR', records: [] };
    }

    try {
      const { data: viewData, error: viewErr } = await client
        .from('student_attendance_summary')
        .select('*');

      if (viewErr) {
        console.log(`[Supabase Diagnostic] Service: attendanceService Source: public.student_attendance_summary Status: ERROR Code: ${viewErr.code} Message: ${viewErr.message}`);
        return { status: 'CONNECTION_ERROR', records: [] };
      }

      const count = viewData?.length || 0;
      console.log(`[Supabase Diagnostic] Service: attendanceService Source: public.student_attendance_summary Status: SUCCESS Rows: ${count}`);

      if (count === 0 && getDatabaseAuthMode() === 'PUBLISHABLE') {
        console.log('[Supabase Diagnostic] Service: attendanceService Status: DATABASE_PERMISSION_DENIED_OR_RLS_BLOCKED Mode: PUBLISHABLE');
        return { status: 'CONNECTION_ERROR', records: [] };
      }

      if (viewData && viewData.length > 0) {
        return {
          status: 'SUCCESS',
          records: viewData.map((d: StudentAttendanceSummaryRow) => ({
            id: `att-${d.student_id}`,
            studentId: d.student_id,
            studentName: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Student',
            departmentCode: d.department_code,
            departmentName: d.department_name,
            className: d.class_name,
            section: d.section,
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || '2025-26',
            totalClasses: Number(d.total_classes || 0),
            attendedClasses: Number(d.attended_classes || 0),
            attendancePct: Number(d.attendance_percentage || 0),
          }))
        };
      }

      // Query succeeded, 0 rows
      return { status: 'NOT_FOUND', records: [] };
    } catch (err: any) {
      console.log(`[Supabase Diagnostic] Service: attendanceService Source: public.student_attendance_summary Status: EXCEPTION Message: ${err.message}`);
      return { status: 'CONNECTION_ERROR', records: [] };
    }
  }

  /**
   * Get attendance for a specific student
   */
  public static async getStudentAttendanceDetailed(studentId?: string, studentName?: string): Promise<AttendanceQueryResult> {
    const client = getSupabaseServerClient();
    if (!isSupabaseServerConfigured() || !client) {
      console.log('[Supabase Diagnostic] Service: attendanceService Source: public.student_attendance_summary Status: ERROR Message: Server client unavailable');
      return { status: 'CONNECTION_ERROR', record: null, errorMessage: "I'm unable to access student records right now. Please try again." };
    }

    if (!studentId && !studentName) {
      return { status: 'NOT_FOUND', record: null };
    }

    try {
      let query = client.from('student_attendance_summary').select('*');
      if (studentId) {
        query = query.ilike('student_id', studentId);
      } else if (studentName) {
        const first = studentName.split(' ')[0];
        query = query.or(`first_name.ilike.%${first}%,last_name.ilike.%${first}%,student_id.ilike.%${studentName}%`);
      }

      const { data, error } = await query.limit(1);
      if (error) {
        console.log(`[Supabase Diagnostic] Service: attendanceService Source: public.student_attendance_summary Student: ${studentId || studentName} Status: ERROR Code: ${error.code} Message: ${error.message}`);
        return { status: 'CONNECTION_ERROR', record: null, errorMessage: "I'm unable to access student records right now. Please try again." };
      }

      const count = data?.length || 0;
      console.log(`[Supabase Diagnostic] Service: attendanceService Source: public.student_attendance_summary Student: ${studentId || studentName} Status: SUCCESS Rows: ${count}`);

      if (count === 0 && getDatabaseAuthMode() === 'PUBLISHABLE') {
        console.log('[Supabase Diagnostic] Service: attendanceService Status: DATABASE_PERMISSION_DENIED_OR_RLS_BLOCKED Mode: PUBLISHABLE');
        return { status: 'CONNECTION_ERROR', record: null, errorMessage: "⚠️ Unable to access student records right now. Please try again in a moment." };
      }

      if (data && data.length > 0) {
        const d: StudentAttendanceSummaryRow = data[0];
        return {
          status: 'SUCCESS',
          record: {
            id: `att-${d.student_id}`,
            studentId: d.student_id,
            studentName: `${d.first_name || ''} ${d.last_name || ''}`.trim() || studentName || 'Student',
            departmentCode: d.department_code,
            departmentName: d.department_name,
            className: d.class_name,
            section: d.section,
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || '2025-26',
            totalClasses: Number(d.total_classes || 0),
            attendedClasses: Number(d.attended_classes || 0),
            attendancePct: Number(d.attendance_percentage || 0),
          }
        };
      }

      return { status: 'NOT_FOUND', record: null };
    } catch (err: any) {
      console.log(`[Supabase Diagnostic] Service: attendanceService Source: public.student_attendance_summary Status: EXCEPTION Message: ${err.message}`);
      return { status: 'CONNECTION_ERROR', record: null, errorMessage: "I'm unable to access student records right now. Please try again." };
    }
  }

  public static async getStudentAttendance(studentId?: string, studentName?: string): Promise<AttendanceRecordItem | null> {
    const res = await this.getStudentAttendanceDetailed(studentId, studentName);
    return res.record;
  }

  /**
   * Get aggregate attendance records for class or department
   */
  public static async getAggregateAttendance(courseOrDept?: string): Promise<{
    status: QueryStatus;
    records: AttendanceRecordItem[];
    avgPercentage: string;
    totalClasses: number;
    attendedClasses: number;
    eligibleCount: number;
    shortageCount: number;
  }> {
    const { status, records: all } = await this.getAllAttendance();
    const filtered = courseOrDept 
      ? all.filter(r => (r.departmentName || r.className || '').toLowerCase().includes(courseOrDept.toLowerCase()))
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
