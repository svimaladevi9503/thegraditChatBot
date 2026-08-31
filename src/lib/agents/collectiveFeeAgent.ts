import { FeeService, FeeRecordItem } from '../../backend/services/feeService';
import { ExportDataPayload } from '../exportUtils';
import { ExportFormatType } from './feeAgent';

export interface CollectiveFeeContext {
  userId?: string;
  targetCourse?: string;
  department?: string;
  semester?: string;
  academicYear?: string;
  format?: ExportFormatType;
  subType?: 'COLLECTION_SUMMARY' | 'PENDING_SUMMARY' | 'PENDING_STUDENTS';
  rawQuery: string;
}

export interface CollectiveFeeResult {
  text: string;
  agent: 'COLLECTIVE_FEE';
  summary?: {
    totalFee: number;
    paidAmount: number;
    dueAmount: number;
    collectionRate: string;
    studentCount: number;
    pendingCount: number;
  };
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  exportPayload?: ExportDataPayload;
  exportFormat?: ExportFormatType;
  quickActions?: { label: string; query: string }[];
}

export class CollectiveFeeAgent {
  /**
   * Handle aggregate, cohort-level, and collective fee queries
   */
  public static async execute(ctx: CollectiveFeeContext): Promise<CollectiveFeeResult> {
    const { status, records } = await FeeService.getAllFeeRecords();

    if (status === 'CONNECTION_ERROR') {
      return {
        text: "⚠️ Unable to access student records right now. Please try again in a moment.",
        agent: 'COLLECTIVE_FEE',
      };
    }

    if (status === 'NOT_FOUND' || records.length === 0) {
      return {
        text: "No fee records were found in the system.",
        agent: 'COLLECTIVE_FEE',
      };
    }

    // Apply real schema filters if present (Department / Course)
    let filtered = records;
    if (ctx.targetCourse || ctx.department) {
      const matchTerm = (ctx.targetCourse || ctx.department || '').toLowerCase();
      filtered = records.filter(r => 
        (r.departmentName || '').toLowerCase().includes(matchTerm) ||
        (r.departmentCode || '').toLowerCase().includes(matchTerm) ||
        (r.className || '').toLowerCase().includes(matchTerm)
      );

      if (filtered.length === 0) {
        return {
          text: `No fee records were found matching "${ctx.targetCourse || ctx.department}".`,
          agent: 'COLLECTIVE_FEE',
        };
      }
    }

    const totalFee = filtered.reduce((acc, r) => acc + r.totalFee, 0);
    const paidAmount = filtered.reduce((acc, r) => acc + r.paidAmount, 0);
    const dueAmount = filtered.reduce((acc, r) => acc + r.dueAmount, 0);
    const collectionRate = totalFee > 0 ? `${((paidAmount / totalFee) * 100).toFixed(1)}%` : '0%';
    const pendingStudents = filtered
      .filter(r => r.dueAmount > 0)
      .sort((a, b) => b.dueAmount - a.dueAmount);

    const qLower = ctx.rawQuery.toLowerCase();
    const isPendingStudentsQuery = ctx.subType === 'PENDING_STUDENTS' || /\b(students with pending|who has not paid|unpaid students|defaulter list|pending students|show students with pending)\b/i.test(qLower);
    const isPendingSummaryQuery = ctx.subType === 'PENDING_SUMMARY' || /\b(how much.*pending|total outstanding|pending fee summary|pending dues)\b/i.test(qLower);

    // ----------------------------------------------------
    // CASE A: Students with Pending Fees List
    // ----------------------------------------------------
    if (isPendingStudentsQuery) {
      if (pendingStudents.length === 0) {
        return {
          text: "✅ No students were found with outstanding fee balances.",
          agent: 'COLLECTIVE_FEE',
        };
      }

      const isShowAll = /\b(all|show more)\b/i.test(qLower);
      const displayList = isShowAll ? pendingStudents : pendingStudents.slice(0, 10);
      const remainingCount = pendingStudents.length - displayList.length;

      let text = `⚠️ **Students With Outstanding Fees**\n\n` +
        `• **Total Students With Dues:** ${pendingStudents.length} / ${filtered.length}\n` +
        `• **Total Outstanding Balance:** ₹${dueAmount.toLocaleString('en-IN')}\n\n`;

      displayList.forEach((st, idx) => {
        const dept = st.departmentName || st.className || 'Student';
        text += `${idx + 1}. **${st.studentName}** — \`${st.studentId}\` — **₹${st.dueAmount.toLocaleString('en-IN')} due** [${dept}]\n`;
      });

      const quickActions = [];
      if (remainingCount > 0) {
        text += `\n*...and ${remainingCount} more students.*`;
        quickActions.push({
          label: `Show more · ${remainingCount} more pending`,
          query: "Show all students with pending fees"
        });
      }

      return {
        text,
        agent: 'COLLECTIVE_FEE',
        summary: {
          totalFee,
          paidAmount,
          dueAmount,
          collectionRate,
          studentCount: filtered.length,
          pendingCount: pendingStudents.length,
        },
        quickActions: quickActions.length > 0 ? quickActions : undefined,
      };
    }

    // ----------------------------------------------------
    // CASE B: Pending Fee Summary
    // ----------------------------------------------------
    if (isPendingSummaryQuery) {
      let text = `📌 **Pending Fee Summary [Odd Semester 2025-26]**\n\n` +
        `• **Total Outstanding:** **₹${dueAmount.toLocaleString('en-IN')}**\n` +
        `• **Students With Pending Fees:** **${pendingStudents.length}** / ${filtered.length}\n` +
        `• **Collection Efficiency:** ${collectionRate}\n`;

      const quickActions = [];
      if (pendingStudents.length > 0) {
        quickActions.push({
          label: `View ${pendingStudents.length} Students With Pending Fees`,
          query: "Students with pending fees"
        });
      }

      return {
        text,
        agent: 'COLLECTIVE_FEE',
        summary: {
          totalFee,
          paidAmount,
          dueAmount,
          collectionRate,
          studentCount: filtered.length,
          pendingCount: pendingStudents.length,
        },
        quickActions: quickActions.length > 0 ? quickActions : undefined,
      };
    }

    // ----------------------------------------------------
    // CASE C: Overall Fee Collection Summary
    // ----------------------------------------------------
    let text = `💰 **Fee Collection Summary [Odd Semester 2025-26]**\n\n` +
      `• **Total Invoiced:** ₹${totalFee.toLocaleString('en-IN')}\n` +
      `• **Total Collected:** ₹${paidAmount.toLocaleString('en-IN')}\n` +
      `• **Total Outstanding:** ₹${dueAmount.toLocaleString('en-IN')}\n` +
      `• **Collection Rate:** **${collectionRate}**\n` +
      `• **Total Records Analyzed:** ${filtered.length} students\n`;

    const quickActions = [];
    if (pendingStudents.length > 0) {
      quickActions.push({
        label: `View ${pendingStudents.length} Students With Dues`,
        query: "Students with pending fees"
      });
    }

    return {
      text,
      agent: 'COLLECTIVE_FEE',
      summary: {
        totalFee,
        paidAmount,
        dueAmount,
        collectionRate,
        studentCount: filtered.length,
        pendingCount: pendingStudents.length,
      },
      quickActions: quickActions.length > 0 ? quickActions : undefined,
    };
  }
}
