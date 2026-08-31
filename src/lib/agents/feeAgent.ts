import { FEE_RECORDS, FeeRecord } from '../mockDatabase';
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
   * Core Fee Calculation Formula:
   * {time period (solo or aggregate)} + {DB data (solo or aggregate)} + intent (what the user wants [.pdf / .xlsx / .docs])
   */
  public static execute(ctx: FeeAgentContext): FeeAgentResult {
    let periodLabel = 'Academic Year 2025-26';
    if (ctx.period === 'ODD_SEM' || ctx.period === 'CURRENT_SEM') {
      periodLabel = 'Odd Semester 2025-26';
    } else if (ctx.period === 'EVEN_SEM') {
      periodLabel = 'Even Semester 2025-26';
    }

    // Filter DB data according to period and target filters
    let matchingRecords = [...FEE_RECORDS];

    if (ctx.targetCourse) {
      matchingRecords = matchingRecords.filter(r => 
        r.course.toLowerCase().includes(ctx.targetCourse!.toLowerCase())
      );
    }

    if (ctx.scope === 'OVERDUE') {
      matchingRecords = matchingRecords.filter(r => r.status === 'OVERDUE' || r.status === 'PENDING');
    }

    // 1. SOLO Student Query
    const targetStudentId = ctx.resolvedStudent?.id;
    const targetStudentName = ctx.resolvedStudent?.name || ctx.targetStudent;

    if (ctx.scope === 'SOLO' || targetStudentName || targetStudentId) {
      const studentMatch = targetStudentId
        ? matchingRecords.find(r => r.studentId === targetStudentId)
        : targetStudentName
        ? matchingRecords.find(r => 
            r.studentName.toLowerCase().includes(targetStudentName.toLowerCase()) || 
            r.studentId.toLowerCase() === targetStudentName.toLowerCase()
          )
        : matchingRecords[0];

      if (!studentMatch) {
        return {
          text: `No fee records found for "${targetStudentName || 'specified student'}" in ${periodLabel}.`,
          agent: 'FEE'
        };
      }

      const statusBadge = studentMatch.status === 'PAID' ? 'Fully Paid' : `Pending Due: ₹${studentMatch.dueAmount.toLocaleString('en-IN')}`;
      let text = `💳 **Fee Status for ${studentMatch.studentName} (${studentMatch.course})**\n\n` +
        `• **Roll Number:** ${ctx.resolvedStudent?.rollNumber || studentMatch.studentId}\n` +
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
          collectionRate: `${((studentMatch.paidAmount / studentMatch.totalFee) * 100).toFixed(1)}%`,
          studentCount: 1,
        },
        exportPayload,
        exportFormat: ctx.format,
      };
    }

    // 2. AGGREGATE College / Department Query
    const totalFee = matchingRecords.reduce((acc, r) => acc + r.totalFee, 0);
    const paidAmount = matchingRecords.reduce((acc, r) => acc + r.paidAmount, 0);
    const dueAmount = matchingRecords.reduce((acc, r) => acc + r.dueAmount, 0);
    const collectionRate = totalFee > 0 ? ((paidAmount / totalFee) * 100).toFixed(1) : '0';

    let text = `📊 **Fee Collection Summary [${periodLabel}]**\n\n` +
      `• **Total Invoiced:** ₹${totalFee.toLocaleString('en-IN')}\n` +
      `• **Total Collected (Paid):** ₹${paidAmount.toLocaleString('en-IN')}\n` +
      `• **Total Outstanding (Due):** ₹${dueAmount.toLocaleString('en-IN')}\n` +
      `• **Collection Rate:** ${collectionRate}%\n` +
      `• **Total Records Analyzed:** ${matchingRecords.length} student records\n\n`;

    const headers = ['Student Name', 'Course', 'Total Fee (₹)', 'Paid (₹)', 'Due (₹)', 'Status'];
    const rows = matchingRecords.map(r => [
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
          { label: 'Total Invoiced', value: `₹${totalFee.toLocaleString('en-IN')}` },
          { label: 'Total Paid', value: `₹${paidAmount.toLocaleString('en-IN')}` },
          { label: 'Outstanding Due', value: `₹${dueAmount.toLocaleString('en-IN')}` },
          { label: 'Collection Rate', value: `${collectionRate}%` },
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
        totalFee,
        paidAmount,
        dueAmount,
        collectionRate: `${collectionRate}%`,
        studentCount: matchingRecords.length,
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
