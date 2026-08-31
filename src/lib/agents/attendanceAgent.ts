import { ATTENDANCE_RECORDS, AttendanceRecord } from '../mockDatabase';
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
   * Core Attendance Calculation Pipeline:
   * Faculty/User -> Orchestrator -> Student Resolver -> Attendance Agent -> PostgreSQL DB
   * Formula: {time period (solo or aggregate)} + {DB data (solo or aggregate)} + intent (what user wants [.pdf / .xlsx / .docs / answer])
   */
  public static execute(ctx: AttendanceAgentContext): AttendanceAgentResult {
    let periodLabel = 'Academic Year 2025-26';
    if (ctx.period === 'ODD_SEM' || ctx.period === 'CURRENT_SEM') {
      periodLabel = 'Odd Semester (2025-26)';
    } else if (ctx.period === 'EVEN_SEM') {
      periodLabel = 'Even Semester (2025-26)';
    } else if (typeof ctx.period === 'string' && ctx.period.includes('2025')) {
      periodLabel = 'Academic Session 2025-26';
    }

    let matchingRecords = [...ATTENDANCE_RECORDS];

    if (ctx.targetCourse) {
      matchingRecords = matchingRecords.filter(r => 
        r.course.toLowerCase().includes(ctx.targetCourse!.toLowerCase())
      );
    }

    if (ctx.targetSubject) {
      matchingRecords = matchingRecords.filter(r => 
        r.subject.toLowerCase().includes(ctx.targetSubject!.toLowerCase())
      );
    }

    // 1. SOLO Student Inquiries (via Student Resolver or Target Student Name)
    const targetStudentId = ctx.resolvedStudent?.id;
    const targetStudentName = ctx.resolvedStudent?.name || ctx.targetStudent;

    if (ctx.scope === 'SOLO' || targetStudentName || targetStudentId) {
      const record = targetStudentId
        ? matchingRecords.find(r => r.studentId === targetStudentId)
        : targetStudentName
        ? matchingRecords.find(r => 
            r.studentName.toLowerCase().includes(targetStudentName.toLowerCase()) ||
            r.studentId.toLowerCase() === targetStudentName.toLowerCase()
          )
        : matchingRecords[0]; // Default student

      if (!record) {
        return {
          text: `No attendance records found for student "${targetStudentName || 'specified'}" in ${periodLabel}.`,
          agent: 'ATTENDANCE'
        };
      }

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
    const totalClassesSum = matchingRecords.reduce((acc, r) => acc + r.totalClasses, 0);
    const attendedClassesSum = matchingRecords.reduce((acc, r) => acc + r.attendedClasses, 0);
    const avgPct = totalClassesSum > 0 
      ? ((attendedClassesSum / totalClassesSum) * 100).toFixed(2) 
      : '0.00';

    const eligibleCount = matchingRecords.filter(r => r.attendancePct >= 75.0).length;
    const shortageCount = matchingRecords.length - eligibleCount;

    let text = `📈 **Class-Wise & Aggregate Attendance Analysis [${periodLabel}]**\n\n` +
      `• **Overall Institutional Average:** **${avgPct}%**\n` +
      `• **Total Class Sessions Logged:** ${totalClassesSum} hours\n` +
      `• **Eligible Students (>= 75%):** ${eligibleCount} students\n` +
      `• **Attendance Shortage (< 75%):** ${shortageCount} students\n\n` +
      `**Class Breakdown:**\n`;

    matchingRecords.forEach(r => {
      const badge = r.attendancePct >= 75 ? '🟢' : '🔴';
      text += `• ${badge} **${r.studentName}** (${r.course}): ${r.attendancePct}% [${r.subject}]\n`;
    });

    const headers = ['Student Name', 'Course', 'Subject', 'Classes', 'Attended', 'Attendance %', 'Status'];
    const rows = matchingRecords.map(r => [
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
          { label: 'Overall Average', value: `${avgPct}%` },
          { label: 'Eligible Students', value: eligibleCount },
          { label: 'Shortage Students', value: shortageCount },
          { label: 'Total Classes', value: totalClassesSum },
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
        avgAttendance: `${avgPct}%`,
        totalClasses: totalClassesSum,
        attendedClasses: attendedClassesSum,
        eligibleCount,
        shortageCount,
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
