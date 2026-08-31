import { getSupabaseServerClient, isSupabaseServerConfigured, getDatabaseAuthMode } from '../config/supabaseServer';
import { QueryStatus } from './studentService';

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

export interface FeeRecordItem {
  id: string;
  studentId: string;
  studentName: string;
  departmentCode?: string;
  departmentName?: string;
  className?: string;
  section?: string;
  semester: string;
  academicYear: string;
  feeType?: string;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  dueDate: string;
}

export interface FeeQueryResult {
  status: QueryStatus;
  record: FeeRecordItem | null;
  errorMessage?: string;
}

export class FeeService {
  /**
   * Fetch all fee records from public.student_fee_summary
   */
  public static async getAllFeeRecords(): Promise<{ status: QueryStatus; records: FeeRecordItem[] }> {
    const client = getSupabaseServerClient();
    if (!isSupabaseServerConfigured() || !client) {
      console.log('[Supabase Diagnostic] Service: feeService Source: public.student_fee_summary Status: ERROR Message: Server client unavailable');
      return { status: 'CONNECTION_ERROR', records: [] };
    }

    try {
      const { data: viewData, error: viewErr } = await client
        .from('student_fee_summary')
        .select('*');

      if (viewErr) {
        console.log(`[Supabase Diagnostic] Service: feeService Source: public.student_fee_summary Status: ERROR Code: ${viewErr.code} Message: ${viewErr.message}`);
        return { status: 'CONNECTION_ERROR', records: [] };
      }

      const count = viewData?.length || 0;
      console.log(`[Supabase Diagnostic] Service: feeService Source: public.student_fee_summary Status: SUCCESS Rows: ${count}`);

      if (count === 0 && getDatabaseAuthMode() === 'PUBLISHABLE') {
        console.log('[Supabase Diagnostic] Service: feeService Status: DATABASE_PERMISSION_DENIED_OR_RLS_BLOCKED Mode: PUBLISHABLE');
        return { status: 'CONNECTION_ERROR', records: [] };
      }

      if (viewData && viewData.length > 0) {
        return {
          status: 'SUCCESS',
          records: viewData.map((d: StudentFeeSummaryRow) => {
            const total = Number(d.amount || 0);
            const paid = Number(d.paid_amount || 0);
            const due = Number(d.pending_amount || Math.max(0, total - paid));
            return {
              id: `fee-${d.student_id}`,
              studentId: d.student_id,
              studentName: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Student',
              departmentCode: d.department_code,
              departmentName: d.department_name,
              className: d.class_name,
              section: d.section,
              semester: d.semester || 'Odd Sem',
              academicYear: d.academic_year || '2025-26',
              feeType: d.fee_type || 'Tuition Fee',
              totalFee: total,
              paidAmount: paid,
              dueAmount: due,
              status: d.payment_status || (due === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING'),
              dueDate: d.due_date || '2025-10-15',
            };
          }),
        };
      }

      return { status: 'NOT_FOUND', records: [] };
    } catch (err: any) {
      console.log(`[Supabase Diagnostic] Service: feeService Source: public.student_fee_summary Status: EXCEPTION Message: ${err.message}`);
      return { status: 'CONNECTION_ERROR', records: [] };
    }
  }

  /**
   * Get fee statement for a specific student
   */
  public static async getStudentFeeDetailed(studentId?: string, studentName?: string): Promise<FeeQueryResult> {
    const client = getSupabaseServerClient();
    if (!isSupabaseServerConfigured() || !client) {
      console.log('[Supabase Diagnostic] Service: feeService Source: public.student_fee_summary Status: ERROR Message: Server client unavailable');
      return { status: 'CONNECTION_ERROR', record: null, errorMessage: "I'm unable to access student records right now. Please try again." };
    }

    if (!studentId && !studentName) {
      return { status: 'NOT_FOUND', record: null };
    }

    try {
      let query = client.from('student_fee_summary').select('*');
      if (studentId) {
        query = query.ilike('student_id', studentId);
      } else if (studentName) {
        const first = studentName.split(' ')[0];
        query = query.or(`first_name.ilike.%${first}%,last_name.ilike.%${first}%,student_id.ilike.%${studentName}%`);
      }

      const { data, error } = await query.limit(1);
      if (error) {
        console.log(`[Supabase Diagnostic] Service: feeService Source: public.student_fee_summary Student: ${studentId || studentName} Status: ERROR Code: ${error.code} Message: ${error.message}`);
        return { status: 'CONNECTION_ERROR', record: null, errorMessage: "I'm unable to access student records right now. Please try again." };
      }

      const count = data?.length || 0;
      console.log(`[Supabase Diagnostic] Service: feeService Source: public.student_fee_summary Student: ${studentId || studentName} Status: SUCCESS Rows: ${count}`);

      if (count === 0 && getDatabaseAuthMode() === 'PUBLISHABLE') {
        console.log('[Supabase Diagnostic] Service: feeService Status: DATABASE_PERMISSION_DENIED_OR_RLS_BLOCKED Mode: PUBLISHABLE');
        return { status: 'CONNECTION_ERROR', record: null, errorMessage: "⚠️ Unable to access student records right now. Please try again in a moment." };
      }

      if (data && data.length > 0) {
        const d: StudentFeeSummaryRow = data[0];
        const total = Number(d.amount || 0);
        const paid = Number(d.paid_amount || 0);
        const due = Number(d.pending_amount || Math.max(0, total - paid));
        return {
          status: 'SUCCESS',
          record: {
            id: `fee-${d.student_id}`,
            studentId: d.student_id,
            studentName: `${d.first_name || ''} ${d.last_name || ''}`.trim() || studentName || 'Student',
            departmentCode: d.department_code,
            departmentName: d.department_name,
            className: d.class_name,
            section: d.section,
            semester: d.semester || 'Odd Sem',
            academicYear: d.academic_year || '2025-26',
            feeType: d.fee_type || 'Tuition Fee',
            totalFee: total,
            paidAmount: paid,
            dueAmount: due,
            status: d.payment_status || (due === 0 ? 'Fully Paid' : 'Pending Due'),
            dueDate: d.due_date || 'N/A',
          }
        };
      }

      return { status: 'NOT_FOUND', record: null };
    } catch (err: any) {
      console.log(`[Supabase Diagnostic] Service: feeService Source: public.student_fee_summary Status: EXCEPTION Message: ${err.message}`);
      return { status: 'CONNECTION_ERROR', record: null, errorMessage: "I'm unable to access student records right now. Please try again." };
    }
  }

  public static async getStudentFee(studentId?: string, studentName?: string): Promise<FeeRecordItem | null> {
    const res = await this.getStudentFeeDetailed(studentId, studentName);
    return res.record;
  }

  /**
   * Get aggregate fee collection statistics
   */
  public static async getAggregateFees(courseOrDept?: string): Promise<{
    status: QueryStatus;
    records: FeeRecordItem[];
    totalFee: number;
    paidAmount: number;
    dueAmount: number;
    collectionRate: string;
  }> {
    const { status, records: all } = await this.getAllFeeRecords();
    const filtered = courseOrDept 
      ? all.filter(r => (r.departmentName || r.className || '').toLowerCase().includes(courseOrDept.toLowerCase()))
      : all;

    const totalFee = filtered.reduce((acc, r) => acc + r.totalFee, 0);
    const paidAmount = filtered.reduce((acc, r) => acc + r.paidAmount, 0);
    const dueAmount = filtered.reduce((acc, r) => acc + r.dueAmount, 0);
    const collectionRate = totalFee > 0 ? ((paidAmount / totalFee) * 100).toFixed(1) + '%' : '0%';

    return {
      status,
      records: filtered,
      totalFee,
      paidAmount,
      dueAmount,
      collectionRate,
    };
  }
}
