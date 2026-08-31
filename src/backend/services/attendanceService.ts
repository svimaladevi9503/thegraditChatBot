import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { ATTENDANCE_RECORDS, AttendanceRecord } from '../../lib/mockDatabase';

export class AttendanceService {
  /**
   * Fetch all attendance records from Supabase or fallback
   */
  public static async getAllAttendance(): Promise<AttendanceRecord[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('*, students(name, roll_number, course)');

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            studentId: d.student_id || d.studentId,
            studentName: d.students?.name || d.studentName || 'Student',
            course: d.students?.course || d.course || 'B.E. CSE',
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || d.academicYear || '2025-26',
            subject: d.subject || 'Core Engineering',
            totalClasses: Number(d.total_classes || d.totalClasses || 60),
            attendedClasses: Number(d.attended_classes || d.attendedClasses || 0),
            attendancePct: Number(d.attendance_pct || d.attendancePct || 0),
          }));
        }
      } catch (err) {
        console.warn('AttendanceService: Supabase query error, using local data:', err);
      }
    }

    return ATTENDANCE_RECORDS;
  }

  /**
   * Get attendance for a specific student ID or Name
   */
  public static async getStudentAttendance(studentId?: string, studentName?: string): Promise<AttendanceRecord | null> {
    const all = await this.getAllAttendance();
    if (studentId) {
      const match = all.find(r => r.studentId === studentId);
      if (match) return match;
    }
    if (studentName) {
      const clean = studentName.toLowerCase();
      const match = all.find(r => r.studentName.toLowerCase().includes(clean));
      if (match) return match;
    }
    return all[0] || null;
  }

  /**
   * Get class-wise or course-filtered attendance
   */
  public static async getCourseAttendance(courseName?: string): Promise<AttendanceRecord[]> {
    const all = await this.getAllAttendance();
    if (!courseName) return all;
    const clean = courseName.toLowerCase();
    return all.filter(r => r.course.toLowerCase().includes(clean));
  }
}
