import { AttendanceService, AttendanceRecordItem } from '../../backend/services/attendanceService';
import { ExportDataPayload } from '../exportUtils';
import { ExportFormatType } from './feeAgent';

export interface CollectiveAttendanceContext {
  userId?: string;
  targetCourse?: string;
  department?: string;
  semester?: string;
  academicYear?: string;
  format?: ExportFormatType;
  subType?: 'SUMMARY' | 'SHORTAGE' | 'ELIGIBLE';
  rawQuery: string;
}

export interface CollectiveAttendanceResult {
  text: string;
  agent: 'COLLECTIVE_ATTENDANCE';
  summary?: {
    totalStudents: number;
    avgAttendance: string;
    eligibleCount: number;
    shortageCount: number;
    totalClasses: number;
  };
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  exportPayload?: ExportDataPayload;
  exportFormat?: ExportFormatType;
  quickActions?: { label: string; query: string }[];
}

export class CollectiveAttendanceAgent {
  /**
   * Handle aggregate, cohort-level, and collective attendance queries
   */
  public static async execute(ctx: CollectiveAttendanceContext): Promise<CollectiveAttendanceResult> {
    const { status, records } = await AttendanceService.getAllAttendance();

    if (status === 'CONNECTION_ERROR') {
      return {
        text: "⚠️ Unable to access student records right now. Please try again in a moment.",
        agent: 'COLLECTIVE_ATTENDANCE',
      };
    }

    if (status === 'NOT_FOUND' || records.length === 0) {
      return {
        text: "No attendance records were found in the system.",
        agent: 'COLLECTIVE_ATTENDANCE',
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
          text: `No attendance records were found matching "${ctx.targetCourse || ctx.department}".`,
          agent: 'COLLECTIVE_ATTENDANCE',
        };
      }
    }

    const totalStudents = filtered.length;
    const totalClasses = filtered.reduce((acc, r) => acc + r.totalClasses, 0);
    const attendedClasses = filtered.reduce((acc, r) => acc + r.attendedClasses, 0);
    const avgPercentage = totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(2) : '0.00';
    const eligibleStudents = filtered.filter(r => r.attendancePct >= 75.0);
    const shortageStudents = filtered.filter(r => r.attendancePct < 75.0);

    const qLower = ctx.rawQuery.toLowerCase();
    const isShortageQuery = ctx.subType === 'SHORTAGE' || /\b(shortage|below 75|detained|defaulter|who is not eligible|attendance shortage)\b/i.test(qLower);
    const isEligibleQuery = ctx.subType === 'ELIGIBLE' || /\b(eligible|eligibility|exam eligible|how many.*eligible|students eligible)\b/i.test(qLower);

    // ----------------------------------------------------
    // CASE A: Attendance Shortage List (< 75%)
    // ----------------------------------------------------
    if (isShortageQuery) {
      if (shortageStudents.length === 0) {
        return {
          text: "✅ No students were found below the 75% attendance threshold in the current dataset.",
          agent: 'COLLECTIVE_ATTENDANCE',
        };
      }

      let text = `⚠️ **Attendance Shortage List (< 75% Requirement)**\n\n` +
        `• **Total Students with Shortage:** ${shortageStudents.length} / ${totalStudents} students\n\n`;

      shortageStudents.slice(0, 10).forEach((st, idx) => {
        const dept = st.departmentName || st.className || 'Student';
        text += `${idx + 1}. **${st.studentName}** — \`${st.studentId}\` — **${st.attendancePct.toFixed(2)}%** (${st.attendedClasses}/${st.totalClasses} classes) [${dept}]\n`;
      });

      if (shortageStudents.length > 10) {
        text += `\n*...and ${shortageStudents.length - 10} more students with attendance shortage.*`;
      }

      return {
        text,
        agent: 'COLLECTIVE_ATTENDANCE',
        summary: {
          totalStudents,
          avgAttendance: avgPercentage,
          eligibleCount: eligibleStudents.length,
          shortageCount: shortageStudents.length,
          totalClasses,
        },
      };
    }

    // ----------------------------------------------------
    // CASE B: Exam Eligibility Summary
    // ----------------------------------------------------
    if (isEligibleQuery) {
      const text = `🎓 **Exam Eligibility Summary**\n\n` +
        `• **Total Students Evaluated:** ${totalStudents}\n` +
        `• **Eligible Students (≥75%):** **${eligibleStudents.length}** students\n` +
        `• **Students Below Requirement (<75%):** **${shortageStudents.length}** students\n` +
        `• **Required Threshold:** **75.0%**\n` +
        `• **Institutional Average:** **${avgPercentage}%**`;

      return {
        text,
        agent: 'COLLECTIVE_ATTENDANCE',
        summary: {
          totalStudents,
          avgAttendance: avgPercentage,
          eligibleCount: eligibleStudents.length,
          shortageCount: shortageStudents.length,
          totalClasses,
        },
        quickActions: shortageStudents.length > 0 ? [
          { label: `View ${shortageStudents.length} Shortage Students`, query: "Attendance shortage list" }
        ] : undefined,
      };
    }

    // ----------------------------------------------------
    // CASE C: Overall Attendance Summary
    // ----------------------------------------------------
    let text = `📊 **Overall Attendance Summary [Odd Semester 2025-26]**\n\n` +
      `• **Total Students:** ${totalStudents}\n` +
      `• **Average Attendance:** **${avgPercentage}%**\n` +
      `• **Students Eligible (≥75%):** **${eligibleStudents.length}**\n` +
      `• **Attendance Shortage (<75%):** **${shortageStudents.length}**\n` +
      `• **Total Class Hours Logged:** ${totalClasses} hrs\n`;

    const quickActions = [];
    if (shortageStudents.length > 0) {
      quickActions.push({
        label: `View ${shortageStudents.length} Shortage Students`,
        query: "Attendance shortage list"
      });
    }

    return {
      text,
      agent: 'COLLECTIVE_ATTENDANCE',
      summary: {
        totalStudents,
        avgAttendance: avgPercentage,
        eligibleCount: eligibleStudents.length,
        shortageCount: shortageStudents.length,
        totalClasses,
      },
      quickActions: quickActions.length > 0 ? quickActions : undefined,
    };
  }
}
