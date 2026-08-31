import { supabase, supabaseAdmin, isSupabaseConfigured } from '../supabaseClient';
import { FEE_RECORDS, FeeRecord } from '../../lib/mockDatabase';

export interface StudentFeeSummaryRow {
  student_id: string;
  first_name: string;
  last_name: string;
  department_code?: string;
  department_name?: string;
  class_name?: string;
  section?: string;
  semester?: string;
  academic_year?: string;
  fee_type?: string;
  amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_status?: string;
  due_date?: string;
}

const useDemoData = process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true';

export class FeeService {
  /**
   * Fetch all fee records preferring `public.student_fee_summary` view
   */
  public static async getAllFeeRecords(): Promise<FeeRecord[]> {
    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured() && client) {
      try {
        // 1. Primary: Prefer student_fee_summary view
        const { data: viewData, error: viewErr } = await client
          .from('student_fee_summary')
          .select('*');

        if (!viewErr && viewData && viewData.length > 0) {
          return viewData.map((d: StudentFeeSummaryRow) => ({
            id: `fee-${d.student_id}`,
            studentId: d.student_id,
            studentName: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Student',
            course: d.class_name || d.department_name || d.department_code || 'B.E. CSE',
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || '2025-26',
            totalFee: Number(d.amount || 0),
            paidAmount: Number(d.paid_amount || 0),
            dueAmount: Number(d.pending_amount || Math.max(0, (d.amount || 0) - (d.paid_amount || 0))),
            status: (d.payment_status?.toUpperCase() as any) || (Number(d.pending_amount || 0) === 0 ? 'PAID' : 'PARTIAL'),
            dueDate: d.due_date || '2025-09-30',
          }));
        }

        // 2. Secondary Table Query: public.fees
        const { data: tblData, error: tblErr } = await client
          .from('fees')
          .select('id, student_id, semester, academic_year, fee_type, amount, paid_amount, due_date, created_at');

        if (!tblErr && tblData && tblData.length > 0) {
          return tblData.map((d: any) => {
            const total = Number(d.amount || 0);
            const paid = Number(d.paid_amount || 0);
            const due = Math.max(0, total - paid);
            return {
              id: String(d.id),
              studentId: d.student_id,
              studentName: `Student (${d.student_id})`,
              course: 'Academic Department',
              semester: d.semester || 'Odd Sem',
              academicYear: d.academic_year || '2025-26',
              totalFee: total,
              paidAmount: paid,
              dueAmount: due,
              status: due === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
              dueDate: d.due_date || '2025-09-30',
            };
          });
        }
      } catch (err) {
        console.warn('FeeService: Supabase query error:', err);
      }
    }

    return useDemoData ? FEE_RECORDS : [];
  }

  /**
   * Get fee statement for a specific student ID or Name
   */
  public static async getStudentFee(studentId?: string, studentName?: string): Promise<FeeRecord | null> {
    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured() && client && (studentId || studentName)) {
      try {
        let query = client.from('student_fee_summary').select('*');
        if (studentId) {
          query = query.eq('student_id', studentId);
        } else if (studentName) {
          const first = studentName.split(' ')[0];
          query = query.or(`first_name.ilike.%${first}%,last_name.ilike.%${first}%,student_id.ilike.%${studentName}%`);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          const d: StudentFeeSummaryRow = data[0];
          const total = Number(d.amount || 0);
          const paid = Number(d.paid_amount || 0);
          const due = Number(d.pending_amount || Math.max(0, total - paid));
          return {
            id: `fee-${d.student_id}`,
            studentId: d.student_id,
            studentName: `${d.first_name || ''} ${d.last_name || ''}`.trim() || studentName || 'Student',
            course: d.class_name || d.department_name || 'B.E. CSE',
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || '2025-26',
            totalFee: total,
            paidAmount: paid,
            dueAmount: due,
            status: (d.payment_status?.toUpperCase() as any) || (due === 0 ? 'PAID' : 'PARTIAL'),
            dueDate: d.due_date || '2025-09-30',
          };
        }
      } catch (err) {
        console.warn('FeeService.getStudentFee: Supabase query error:', err);
      }
    }

    // Demo fallback ONLY if explicit flag enabled
    if (useDemoData) {
      const all = FEE_RECORDS;
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
   * Get aggregate fee collection statistics
   */
  public static async getAggregateFees(courseOrDept?: string): Promise<{
    records: FeeRecord[];
    totalFee: number;
    paidAmount: number;
    dueAmount: number;
    collectionRate: string;
  }> {
    const all = await this.getAllFeeRecords();
    const filtered = courseOrDept 
      ? all.filter(r => r.course.toLowerCase().includes(courseOrDept.toLowerCase()))
      : all;

    const totalFee = filtered.reduce((acc, r) => acc + r.totalFee, 0);
    const paidAmount = filtered.reduce((acc, r) => acc + r.paidAmount, 0);
    const dueAmount = filtered.reduce((acc, r) => acc + r.dueAmount, 0);
    const collectionRate = totalFee > 0 ? ((paidAmount / totalFee) * 100).toFixed(1) + '%' : '0%';

    return {
      records: filtered,
      totalFee,
      paidAmount,
      dueAmount,
      collectionRate,
    };
  }
}
