import { FeeRecord } from '../mockDatabase';
import { FeeService, FeeQueryResult } from '../../backend/services/feeService';
import { ExportDataPayload } from '../exportUtils';
import { ResolvedStudent } from '../studentResolver';

export type TimePeriodType = 'CURRENT_SEM' | 'ODD_SEM' | 'EVEN_SEM' | 'PREV_SEM' | 'MONTH' | 'ALL_TIME' | 'YEAR_2025_26';
export type QueryScopeType = 'SOLO' | 'AGGREGATE' | 'DEPARTMENT' | 'OVERDUE';
export type ExportFormatType = 'NONE' | 'PDF' | 'XLSX' | 'DOCS';

export interface FeeAgentContext {
  userId?: string;
  userRole?: 'STUDENT' | 'ADMIN' | 'FACULTY';
  period: TimePeriodType | string;
  scope: QueryScopeType;
  resolvedStudent?: ResolvedStudent | null;
  targetStudent?: string;
  targetCourse?: string;
  format: ExportFormatType;
  rawQuery: string;
}

export interface FeeAgentResult {
  text: string;
  agent: 'FEE';
  summary?: {
    totalFee: number;
    paidAmount: number;
    dueAmount: number;
    collectionRate: string;
    studentCount: number;
  };
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  exportPayload?: ExportDataPayload;
  exportFormat?: ExportFormatType;
}

export class FeeAgent {
  /**
   * Fee Calculation Pipeline:
   * 1. Supabase returns data -> Show live data
   * 2. Supabase returns no student -> "I couldn't find a student matching that name."
   * 3. Supabase connection fails -> "I'm unable to access student records right now. Please try again."
   */
  public static async execute(ctx: FeeAgentContext): Promise<FeeAgentResult> {
    let periodLabel = 'Academic Year 2025-26';
    if (ctx.period === 'ODD_SEM' || ctx.period === 'CURRENT_SEM') {
      periodLabel = 'Odd Semester 2025-26';
    } else if (ctx.period === 'EVEN_SEM') {
      periodLabel = 'Even Semester 2025-26';
    }

    // 1. SOLO Student Query
    const targetStudentId = ctx.resolvedStudent?.id || (ctx.resolvedStudent as any)?.rollNumber;
    const targetStudentName = ctx.resolvedStudent?.name || ctx.targetStudent;

    if (ctx.scope === 'SOLO' || targetStudentName || targetStudentId) {
      const detailed: FeeQueryResult = await FeeService.getStudentFeeDetailed(targetStudentId, targetStudentName);

      if (detailed.status === 'CONNECTION_ERROR') {
        return {
          text: "I'm unable to access student records right now. Please try again.",
          agent: 'FEE'
        };
      }

      if (detailed.status === 'NOT_FOUND' || !detailed.record) {
        return {
          text: "I couldn't find a student matching that name.",
          agent: 'FEE'
        };
      }

      const studentMatch = detailed.record;
      const statusBadge = studentMatch.status === 'PAID' ? 'Fully Paid' : `Pending Due: ₹${studentMatch.dueAmount.toLocaleString('en-IN')}`;
      let text = `💳 **Fee Status for ${studentMatch.studentName} (${studentMatch.course})**\n\n` +
        `• **Roll / Student ID:** ${ctx.resolvedStudent?.rollNumber || studentMatch.studentId}\n` +
        `• **Academic Period:** ${periodLabel}\n` +
        `• **Total Course Fee:** ₹${studentMatch.totalFee.toLocaleString('en-IN')}\n` +
        `• **Paid Amount:** ₹${studentMatch.paidAmount.toLocaleString('en-IN')}\n` +
        `• **Due Balance:** ₹${studentMatch.dueAmount.toLocaleString('en-IN')}\n` +
        `• **Payment Status:** ${statusBadge}\n` +
        `• **Due Date:** ${studentMatch.dueDate}\n`;

      if (studentMatch.dueAmount > 0) {
        text += `\n⚠️ *Please clear pending dues prior to semester exam clearance.*`;
      } else {
        text += `\n✅ *All dues cleared. Eligible for hall ticket generation.*`;
      }

      let exportPayload: ExportDataPayload | undefined;
      if (ctx.format !== 'NONE') {
        exportPayload = {
          title: `Fee Statement - ${studentMatch.studentName}`,
          subtitle: `Roll: ${ctx.resolvedStudent?.rollNumber || studentMatch.studentId} | Course: ${studentMatch.course}`,
          generatedDate: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
          summaryStats: [
            { label: 'Total Fee', value: `₹${studentMatch.totalFee.toLocaleString('en-IN')}` },
            { label: 'Paid', value: `₹${studentMatch.paidAmount.toLocaleString('en-IN')}` },
            { label: 'Due', value: `₹${studentMatch.dueAmount.toLocaleString('en-IN')}` },
          ],
          headers: ['Student Name', 'Course', 'Semester', 'Total (₹)', 'Paid (₹)', 'Due (₹)', 'Status', 'Due Date'],
          rows: [[
            studentMatch.studentName,
            studentMatch.course,
            studentMatch.semester,
            studentMatch.totalFee.toLocaleString('en-IN'),
            studentMatch.paidAmount.toLocaleString('en-IN'),
            studentMatch.dueAmount.toLocaleString('en-IN'),
            studentMatch.status,
            studentMatch.dueDate
          ]]
        };
        text += `\n\n📄 *Generated ${ctx.format} document ready for instant download below.*`;
      }

      return {
        text,
        agent: 'FEE',
        summary: {
          totalFee: studentMatch.totalFee,
          paidAmount: studentMatch.paidAmount,
          dueAmount: studentMatch.dueAmount,
          collectionRate: `${studentMatch.totalFee > 0 ? ((studentMatch.paidAmount / studentMatch.totalFee) * 100).toFixed(1) : '100'}%`,
          studentCount: 1,
        },
        exportPayload,
        exportFormat: ctx.format,
      };
    }

    // 2. AGGREGATE College / Department Query
    const aggregate = await FeeService.getAggregateFees(ctx.targetCourse);

    if (aggregate.status === 'CONNECTION_ERROR') {
      return {
        text: "I'm unable to access student records right now. Please try again.",
        agent: 'FEE'
      };
    }

    if (aggregate.status === 'NOT_FOUND' || aggregate.records.length === 0) {
      return {
        text: "No fee records found for this cohort.",
        agent: 'FEE'
      };
    }

    let text = `📊 **Fee Collection Summary [${periodLabel}]**\n\n` +
      `• **Total Invoiced:** ₹${aggregate.totalFee.toLocaleString('en-IN')}\n` +
      `• **Total Collected (Paid):** ₹${aggregate.paidAmount.toLocaleString('en-IN')}\n` +
      `• **Total Outstanding (Due):** ₹${aggregate.dueAmount.toLocaleString('en-IN')}\n` +
      `• **Collection Rate:** ${aggregate.collectionRate}\n` +
      `• **Total Records Analyzed:** ${aggregate.records.length} student records\n\n`;

    const headers = ['Student Name', 'Course', 'Total Fee (₹)', 'Paid (₹)', 'Due (₹)', 'Status'];
    const rows = aggregate.records.map(r => [
      r.studentName,
      r.course,
      r.totalFee.toLocaleString('en-IN'),
      r.paidAmount.toLocaleString('en-IN'),
      r.dueAmount.toLocaleString('en-IN'),
      r.status
    ]);

    let exportPayload: ExportDataPayload | undefined;
    if (ctx.format !== 'NONE') {
      exportPayload = {
        title: `Comprehensive Fee Collection Report - ${periodLabel}`,
        subtitle: `Technical Team College Institutional Audit`,
        generatedDate: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
        summaryStats: [
          { label: 'Total Invoiced', value: `₹${aggregate.totalFee.toLocaleString('en-IN')}` },
          { label: 'Total Paid', value: `₹${aggregate.paidAmount.toLocaleString('en-IN')}` },
          { label: 'Outstanding Due', value: `₹${aggregate.dueAmount.toLocaleString('en-IN')}` },
          { label: 'Collection Rate', value: aggregate.collectionRate },
        ],
        headers,
        rows,
      };
      text += `📄 *Institutional Fee Statement has been formatted for ${ctx.format} export below.*`;
    }

    return {
      text,
      agent: 'FEE',
      summary: {
        totalFee: aggregate.totalFee,
        paidAmount: aggregate.paidAmount,
        dueAmount: aggregate.dueAmount,
        collectionRate: aggregate.collectionRate,
        studentCount: aggregate.records.length,
      },
      tableData: {
        headers,
        rows,
      },
      exportPayload,
      exportFormat: ctx.format,
    };
  }
}
