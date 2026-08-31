import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { FEE_RECORDS, FeeRecord } from '../../lib/mockDatabase';

export class FeeService {
  /**
   * Fetch all fee records from Supabase or fallback
   */
  public static async getAllFeeRecords(): Promise<FeeRecord[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('fee_records')
          .select('*, students(name, roll_number, course)');

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            studentId: d.student_id || d.studentId,
            studentName: d.students?.name || d.studentName || 'Student',
            course: d.students?.course || d.course || 'B.E. CSE',
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || d.academicYear || '2025-26',
            totalFee: Number(d.total_fee || d.totalFee || 0),
            paidAmount: Number(d.paid_amount || d.paidAmount || 0),
            dueAmount: Number(d.due_amount || d.dueAmount || 0),
            status: d.status || (Number(d.due_amount || 0) === 0 ? 'PAID' : 'PARTIAL'),
            dueDate: d.due_date || d.dueDate || '2025-09-30',
          }));
        }
      } catch (err) {
        console.warn('FeeService: Supabase query error, using local data:', err);
      }
    }

    return FEE_RECORDS;
  }

  /**
   * Get fee record for a specific student
   */
  public static async getStudentFee(studentId?: string, studentName?: string): Promise<FeeRecord | null> {
    const all = await this.getAllFeeRecords();
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
   * Get overdue or pending fee records
   */
  public static async getPendingFeeRecords(): Promise<FeeRecord[]> {
    const all = await this.getAllFeeRecords();
    return all.filter(r => r.status === 'PENDING' || r.status === 'OVERDUE' || r.dueAmount > 0);
  }
}
