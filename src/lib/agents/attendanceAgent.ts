import { AttendanceRecord } from '../mockDatabase';
import { AttendanceService, AttendanceQueryResult } from '../../backend/services/attendanceService';
import { ExportDataPayload } from '../exportUtils';
import { TimePeriodType, QueryScopeType, ExportFormatType } from './feeAgent';
import { ResolvedStudent } from '../studentResolver';

export interface AttendanceAgentContext {
  userId?: string;
  userRole?: 'STUDENT' | 'ADMIN' | 'FACULTY';
  period: TimePeriodType | string;
  scope: QueryScopeType;
  resolvedStudent?: ResolvedStudent | null;
  targetStudent?: string;
  targetCourse?: string;
  targetSubject?: string;
  format: ExportFormatType;
  rawQuery: string;
}

export interface AttendanceAgentResult {
  text: string;
  agent: 'ATTENDANCE';
  summary?: {
    avgAttendance: string;
    totalClasses: number;
    attendedClasses: number;
    eligibleCount: number;
    shortageCount: number;
  };
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  exportPayload?: ExportDataPayload;
  exportFormat?: ExportFormatType;
}

export class AttendanceAgent {
  /**
   * Attendance Calculation Pipeline:
   * 1. Supabase returns data -> Show live data
   * 2. Supabase returns no student -> "I couldn't find a student matching that name."
   * 3. Supabase connection fails -> "I'm unable to access student records right now. Please try again."
   */
  public static async execute(ctx: AttendanceAgentContext): Promise<AttendanceAgentResult> {
    let periodLabel = 'Academic Year 2025-26';
    if (ctx.period === 'ODD_SEM' || ctx.period === 'CURRENT_SEM') {
      periodLabel = 'Odd Semester (2025-26)';
    } else if (ctx.period === 'EVEN_SEM') {
      periodLabel = 'Even Semester (2025-26)';
    } else if (typeof ctx.period === 'string' && ctx.period.includes('2025')) {
      periodLabel = 'Academic Session 2025-26';
    }

    // 1. SOLO Student Inquiries
    const targetStudentId = ctx.resolvedStudent?.id || (ctx.resolvedStudent as any)?.rollNumber;
    const targetStudentName = ctx.resolvedStudent?.name || ctx.targetStudent;

    if (ctx.scope === 'SOLO' || targetStudentName || targetStudentId) {
      const detailed: AttendanceQueryResult = await AttendanceService.getStudentAttendanceDetailed(targetStudentId, targetStudentName);

      if (detailed.status === 'CONNECTION_ERROR') {
        return {
          text: "I'm unable to access student records right now. Please try again.",
          agent: 'ATTENDANCE'
        };
      }

      if (detailed.status === 'NOT_FOUND' || !detailed.record) {
        return {
          text: "I couldn't find a student matching that name.",
          agent: 'ATTENDANCE'
        };
      }

      const record = detailed.record;
      const isEligible = record.attendancePct >= 75.0;
      const statusIcon = isEligible ? '✅' : '⚠️';

      let text = `📋 **Attendance Details for ${record.studentName} [${periodLabel}]**\n\n` +
        `• **Student ID / Roll:** ${ctx.resolvedStudent?.rollNumber || record.studentId}\n` +
        `• **Course & Dept:** ${record.course}\n` +
        `• **Subject Module:** ${record.subject}\n` +
        `• **Lectures Attended:** **${record.attendedClasses}** / **${record.totalClasses}** classes\n` +
        `• **Attendance Score:** **${record.attendancePct}%**\n` +
        `• **Exam Eligibility:** ${statusIcon} ${isEligible ? 'Eligible for Examinations (>= 75%)' : 'Attendance Shortage Alert (< 75%)'}\n`;

      if (!isEligible) {
        const needed = Math.ceil((0.75 * record.totalClasses - record.attendedClasses) / (1 - 0.75));
        text += `\n⚠️ *Recommendation: Must attend next ${Math.max(1, needed)} consecutive lectures to satisfy university examination eligibility.*`;
      } else {
        text += `\n✅ *Regular attendance standing maintained for ${periodLabel}.*`;
      }

      let exportPayload: ExportDataPayload | undefined;
      if (ctx.format !== 'NONE') {
        exportPayload = {
          title: `Official Attendance Transcript - ${record.studentName}`,
          subtitle: `Roll: ${ctx.resolvedStudent?.rollNumber || record.studentId} | Period: ${periodLabel}`,
          generatedDate: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
          summaryStats: [
            { label: 'Attendance', value: `${record.attendancePct}%` },
            { label: 'Attended', value: `${record.attendedClasses}/${record.totalClasses}` },
            { label: 'Eligibility', value: isEligible ? 'Eligible' : 'Shortage' },
          ],
          headers: ['Student Name', 'Course', 'Subject', 'Total Classes', 'Attended', 'Percentage', 'Eligibility'],
          rows: [[
            record.studentName,
            record.course,
            record.subject,
            record.totalClasses,
            record.attendedClasses,
            `${record.attendancePct}%`,
            isEligible ? 'ELIGIBLE' : 'SHORTAGE'
          ]]
        };
        text += `\n\n📄 *Verified institutional transcript ready in ${ctx.format} format for download below.*`;
      }

      return {
        text,
        agent: 'ATTENDANCE',
        summary: {
          avgAttendance: `${record.attendancePct}%`,
          totalClasses: record.totalClasses,
          attendedClasses: record.attendedClasses,
          eligibleCount: isEligible ? 1 : 0,
          shortageCount: isEligible ? 0 : 1,
        },
        exportPayload,
        exportFormat: ctx.format,
      };
    }

    // 2. AGGREGATE Class-Wise / Department / College Inquiries
    const aggregate = await AttendanceService.getAggregateAttendance(ctx.targetCourse);

    if (aggregate.status === 'CONNECTION_ERROR') {
      return {
        text: "I'm unable to access student records right now. Please try again.",
        agent: 'ATTENDANCE'
      };
    }

    if (aggregate.status === 'NOT_FOUND' || aggregate.records.length === 0) {
      return {
        text: "No attendance records found for this cohort.",
        agent: 'ATTENDANCE'
      };
    }

    let text = `📈 **Class-Wise & Aggregate Attendance Analysis [${periodLabel}]**\n\n` +
      `• **Overall Institutional Average:** **${aggregate.avgPercentage}%**\n` +
      `• **Total Class Sessions Logged:** ${aggregate.totalClasses} hours\n` +
      `• **Eligible Students (>= 75%):** ${aggregate.eligibleCount} students\n` +
      `• **Attendance Shortage (< 75%):** ${aggregate.shortageCount} students\n\n` +
      `**Class Breakdown:**\n`;

    aggregate.records.slice(0, 10).forEach(r => {
      const badge = r.attendancePct >= 75 ? '🟢' : '🔴';
      text += `• ${badge} **${r.studentName}** (${r.course}): ${r.attendancePct}% [${r.subject}]\n`;
    });

    const headers = ['Student Name', 'Course', 'Subject', 'Classes', 'Attended', 'Attendance %', 'Status'];
    const rows = aggregate.records.map(r => [
      r.studentName,
      r.course,
      r.subject,
      r.totalClasses,
      r.attendedClasses,
      `${r.attendancePct}%`,
      r.attendancePct >= 75 ? 'ELIGIBLE' : 'SHORTAGE'
    ]);

    let exportPayload: ExportDataPayload | undefined;
    if (ctx.format !== 'NONE') {
      exportPayload = {
        title: `Institutional Attendance Audit Report - ${periodLabel}`,
        subtitle: `Technical Team College Academic Council`,
        generatedDate: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
        summaryStats: [
          { label: 'Overall Average', value: `${aggregate.avgPercentage}%` },
          { label: 'Eligible Students', value: aggregate.eligibleCount },
          { label: 'Shortage Students', value: aggregate.shortageCount },
          { label: 'Total Classes', value: aggregate.totalClasses },
        ],
        headers,
        rows,
      };
      text += `\n📄 *Institutional attendance ledger has been compiled in ${ctx.format} format for download below.*`;
    }

    return {
      text,
      agent: 'ATTENDANCE',
      summary: {
        avgAttendance: `${aggregate.avgPercentage}%`,
        totalClasses: aggregate.totalClasses,
        attendedClasses: aggregate.attendedClasses,
        eligibleCount: aggregate.eligibleCount,
        shortageCount: aggregate.shortageCount,
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
