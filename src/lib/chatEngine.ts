import { StudentResolver, StudentResolutionContract } from './studentResolver';
import { AttendanceAgent, AttendanceAgentResult } from './agents/attendanceAgent';
import { FeeAgent, FeeAgentResult, TimePeriodType, ExportFormatType } from './agents/feeAgent';
import { CollectiveAttendanceAgent, CollectiveAttendanceResult } from './agents/collectiveAttendanceAgent';
import { CollectiveFeeAgent, CollectiveFeeResult } from './agents/collectiveFeeAgent';
import { StudentService } from '../backend/services/studentService';

export type AgentType = 
  | 'ATTENDANCE' 
  | 'FEE' 
  | 'COLLECTIVE_ATTENDANCE' 
  | 'COLLECTIVE_FEE' 
  | 'ORCHESTRATOR' 
  | 'MISC' 
  | 'UNKNOWN';

export type QueryIntentCategory =
  | 'INDIVIDUAL_ATTENDANCE'
  | 'INDIVIDUAL_FEE'
  | 'COLLECTIVE_ATTENDANCE'
  | 'COLLECTIVE_FEE'
  | 'STUDENT_LOOKUP'
  | 'MISC'
  | 'UNKNOWN';

export interface ChatMessageResponse {
  text: string;
  agent: AgentType;
  confidenceTier: 'TIER_1_REGEX' | 'TIER_2_FUZZY' | 'TIER_3_FALLBACK';
  resolvedStudent?: {
    id: string;
    name: string;
    rollNumber: string;
    department?: string;
    class?: string;
  };
  exportPayload?: any;
  exportFormat?: ExportFormatType;
  quickActions?: { label: string; query: string }[];
  error?: boolean;
}

// ----------------------------------------------------
// TIER 1 - DETERMINISTIC REGEX DICTIONARIES
// ----------------------------------------------------
const COLLECTIVE_ATTENDANCE_REGEX = /\b(overall attendance|class wise attendance|class attendance|department attendance|students below 75|attendance shortage|shortage list|who is not eligible|eligible students|how many.*eligible|students eligible|average attendance|attendance summary|attendance report|attendance audit)\b/i;
const COLLECTIVE_FEE_REGEX = /\b(total fees collected|total fee collected|overall fee|overall fees|fee collection|how much.*pending|students with pending|who has not paid|unpaid students|defaulter list|fee collection summary|total outstanding|paid vs pending|fee report|pending fee summary|pending dues summary)\b/i;

const INDIVIDUAL_ATTENDANCE_KEYWORDS = /\b(attendance|present|absent|shortage|classes|attended|bunk|eligibility|percentage|lectures|sessions)\b/i;
const INDIVIDUAL_FEE_KEYWORDS = /\b(fee|fees|paid|due|dues|balance|pending|receipt|tuition|installment|scholarship|payment|statement|invoice)\b/i;
const MISC_KEYWORDS = /\b(help|what can you do|commands|options|hello|hi|hey|greetings|clear|who are you|reset)\b/i;
const SHOW_MORE_REGEX = /\b(show more|list all|all .* students|show all .* students|more for)\b/i;

// Department & Course Extraction
const COURSE_PATTERNS: Record<string, RegExp> = {
  'B.E. CSE': /\b(cse|computer science|comp sci|b\.?e\.?\s*cse)\b/i,
  'B.E. IT': /\b(it|information technology|b\.?e\.?\s*it)\b/i,
  'B.E. ECE': /\b(ece|electronics|b\.?e\.?\s*ece)\b/i,
  'B.E. Mechanical': /\b(mech|mechanical|b\.?e\.?\s*mech)\b/i,
  'Architecture': /\b(b\.?arch|architecture|arch)\b/i,
  'B.Com Accounts': /\b(b\.?com|commerce|accounts)\b/i,
  'MBA. HR': /\b(mba|management|human resources|hr)\b/i,
  'Construction Management': /\b(construction|civil)\b/i,
};

export class OrchestratorAgent {
  /**
   * Sanitizes input
   */
  public static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .trim()
      .slice(0, 300)
      .replace(/[<>"`\\]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Classifies query into clean intent categories
   */
  public static classifyIntent(query: string, hasCandidates: boolean): QueryIntentCategory {
    const clean = query.toLowerCase();

    // 1. General Misc / Capabilities Questions
    if (MISC_KEYWORDS.test(clean) && !hasCandidates) {
      return 'MISC';
    }

    // 2. Explicit Collective Queries (Bypasses individual student resolver)
    if (COLLECTIVE_ATTENDANCE_REGEX.test(clean)) {
      return 'COLLECTIVE_ATTENDANCE';
    }
    if (COLLECTIVE_FEE_REGEX.test(clean)) {
      return 'COLLECTIVE_FEE';
    }

    // 3. Individual Queries
    if (hasCandidates || /['’]s|\bfor\b|\bof\b|\bstudent\b/i.test(query)) {
      if (INDIVIDUAL_ATTENDANCE_KEYWORDS.test(clean)) return 'INDIVIDUAL_ATTENDANCE';
      if (INDIVIDUAL_FEE_KEYWORDS.test(clean)) return 'INDIVIDUAL_FEE';
      return 'STUDENT_LOOKUP';
    }

    // 4. General Intents
    if (INDIVIDUAL_ATTENDANCE_KEYWORDS.test(clean)) return 'COLLECTIVE_ATTENDANCE';
    if (INDIVIDUAL_FEE_KEYWORDS.test(clean)) return 'COLLECTIVE_FEE';
    if (MISC_KEYWORDS.test(clean)) return 'MISC';

    return 'UNKNOWN';
  }

  private static extractCourse(query: string): string | undefined {
    for (const [courseName, regex] of Object.entries(COURSE_PATTERNS)) {
      if (regex.test(query)) {
        return courseName;
      }
    }
    return undefined;
  }

  /**
   * Master Process Query Pipeline
   */
  public static async processQuery(rawInput: string, userId: string = 'st-00'): Promise<ChatMessageResponse> {
    const sanitized = this.sanitizeInput(rawInput);

    if (!sanitized) {
      return {
        text: "Please ask a question regarding fees, attendance, or student records.",
        agent: 'ORCHESTRATOR',
        confidenceTier: 'TIER_1_REGEX'
      };
    }

    // Extract potential student candidates
    const candidates = StudentService.extractCandidates(rawInput);
    const targetCourse = this.extractCourse(sanitized);
    const intent = this.classifyIntent(sanitized, candidates.length > 0);

    // =========================================================================
    // 🔴 ROUTING PRIORITY 1 — COLLECTIVE QUERIES (Bypasses StudentResolver)
    // =========================================================================
    if (intent === 'COLLECTIVE_ATTENDANCE') {
      const result: CollectiveAttendanceResult = await CollectiveAttendanceAgent.execute({
        userId,
        targetCourse,
        rawQuery: sanitized,
      });

      return {
        text: result.text,
        agent: 'COLLECTIVE_ATTENDANCE',
        confidenceTier: 'TIER_1_REGEX',
        quickActions: result.quickActions,
      };
    }

    if (intent === 'COLLECTIVE_FEE') {
      const result: CollectiveFeeResult = await CollectiveFeeAgent.execute({
        userId,
        targetCourse,
        rawQuery: sanitized,
      });

      return {
        text: result.text,
        agent: 'COLLECTIVE_FEE',
        confidenceTier: 'TIER_1_REGEX',
        quickActions: result.quickActions,
      };
    }

    if (intent === 'MISC') {
      return {
        text: "👋 **GRADit Assistant Capabilities:**\n\n" +
          "• **Individual Attendance:** *\"Rahul's attendance\"* or *\"Show attendance for 2025CSE019\"*\n" +
          "• **Individual Fees:** *\"What is Rahul's pending fee?\"*\n" +
          "• **Collective Attendance:** *\"Overall attendance\"* or *\"Attendance shortage list\"*\n" +
          "• **Collective Fees:** *\"Total fees collected\"* or *\"Students with pending fees\"*",
        agent: 'MISC',
        confidenceTier: 'TIER_1_REGEX'
      };
    }

    // =========================================================================
    // 🔴 ROUTING PRIORITY 2 — INDIVIDUAL STUDENT RESOLUTION
    // =========================================================================
    const isAttendanceIntent = INDIVIDUAL_ATTENDANCE_KEYWORDS.test(sanitized);
    const isFeeIntent = INDIVIDUAL_FEE_KEYWORDS.test(sanitized);
    const intentSuffix = isAttendanceIntent ? 'attendance' : isFeeIntent ? 'pending fee' : 'details';

    const resolution: StudentResolutionContract = await StudentResolver.resolve(sanitized);

    // Case A: CONNECTION_ERROR
    if (resolution.status === 'CONNECTION_ERROR') {
      return {
        text: "⚠️ Unable to access student records right now. Please try again in a moment.",
        agent: 'ORCHESTRATOR',
        confidenceTier: 'TIER_1_REGEX',
        error: true,
      };
    }

    // Case B: AMBIGUOUS (Multiple matches -> Return suggestions, NEVER call sub-agents)
    if (resolution.status === 'AMBIGUOUS' && resolution.matches && resolution.matches.length > 1) {
      const allMatches = resolution.matches;
      const searchTerm = resolution.searchTerm;
      const isShowMore = SHOW_MORE_REGEX.test(sanitized);

      // Pagination expansion for Show More (matches 4 onwards)
      if (isShowMore && allMatches.length > 3) {
        const remainingList = allMatches.slice(3);
        let remText = `🔍 **Remaining ${remainingList.length} students matching "${searchTerm}":**\n\n`;
        const remQuickActions: { label: string; query: string }[] = [];

        remainingList.forEach((st, idx) => {
          const dept = st.department || st.class || 'Student';
          remText += `${idx + 4}. **${st.first_name} ${st.last_name}** — \`${st.student_id}\` (${dept})\n`;
          remQuickActions.push({
            label: `${st.first_name} ${st.last_name} · ${st.student_id}`,
            query: `Show ${st.student_id} ${intentSuffix}`,
          });
        });

        remText += `\nPlease select the student you mean.`;

        return {
          text: remText,
          agent: 'ORCHESTRATOR',
          confidenceTier: 'TIER_1_REGEX',
          quickActions: remQuickActions,
        };
      }

      // Default First Ambiguous Response: Top 3 Matches + Show More Button
      const top3 = allMatches.slice(0, 3);
      const remainingCount = allMatches.length - top3.length;

      let ambText = `🔍 I found **${allMatches.length} students** matching "**${searchTerm}**".\n\n` +
        `**Top matches:**\n`;

      const quickActions: { label: string; query: string }[] = [];

      top3.forEach((st, idx) => {
        const dept = st.department || st.class || 'Student';
        ambText += `${idx + 1}. **${st.first_name} ${st.last_name}** — \`${st.student_id}\` (${dept})\n`;
        quickActions.push({
          label: `${st.first_name} ${st.last_name} · ${st.student_id}`,
          query: `Show ${st.student_id} ${intentSuffix}`,
        });
      });

      ambText += `\nPlease select the student you mean.`;

      if (remainingCount > 0) {
        ambText += `\n\n*...and ${remainingCount} more students found.*`;
        quickActions.push({
          label: `Show more · ${remainingCount} more`,
          query: `Show all ${searchTerm} students ${intentSuffix}`,
        });
      }

      // Hard safety check: Ambiguous result NEVER reaches AttendanceAgent or FeeAgent
      return {
        text: ambText,
        agent: 'ORCHESTRATOR',
        confidenceTier: 'TIER_1_REGEX',
        quickActions,
      };
    }

    // Case C: NOT_FOUND for individual student search
    const isExplicitSolo = /['’]s|\bfor\b|\bof\b|\bstudent\b/i.test(rawInput) || candidates.length > 0;
    if (resolution.status === 'NOT_FOUND' && isExplicitSolo) {
      return {
        text: "I couldn't find a student matching that name.",
        agent: isAttendanceIntent ? 'ATTENDANCE' : isFeeIntent ? 'FEE' : 'ORCHESTRATOR',
        confidenceTier: 'TIER_1_REGEX',
      };
    }

    // Case D: RESOLVED Single Student
    const resolvedStudent = resolution.status === 'RESOLVED' && resolution.student ? {
      id: resolution.student.id,
      name: `${resolution.student.first_name} ${resolution.student.last_name}`.trim(),
      rollNumber: resolution.student.student_id,
      department: resolution.student.department,
      class: resolution.student.class,
    } : undefined;

    // =========================================================================
    // 🔴 ROUTING PRIORITY 3 — SUB-AGENT DELEGATION
    // =========================================================================
    try {
      if (isAttendanceIntent || (resolvedStudent && !isFeeIntent)) {
        const result: AttendanceAgentResult = await AttendanceAgent.execute({
          userId,
          period: 'CURRENT_SEM',
          scope: 'SOLO',
          resolvedStudent: resolvedStudent ? {
            id: resolvedStudent.id,
            name: resolvedStudent.name,
            rollNumber: resolvedStudent.rollNumber,
            course: resolvedStudent.class || resolvedStudent.department || 'Course',
            semester: 'Odd Sem',
            academicYear: '2025-26',
            confidence: 1.0,
          } : null,
          targetStudent: resolvedStudent?.name,
          targetCourse,
          format: 'NONE',
          rawQuery: sanitized
        });

        return {
          text: result.text,
          agent: 'ATTENDANCE',
          confidenceTier: 'TIER_1_REGEX',
          resolvedStudent,
          exportPayload: result.exportPayload,
          exportFormat: result.exportFormat
        };
      }

      if (isFeeIntent) {
        const result: FeeAgentResult = await FeeAgent.execute({
          userId,
          period: 'CURRENT_SEM',
          scope: 'SOLO',
          resolvedStudent: resolvedStudent ? {
            id: resolvedStudent.id,
            name: resolvedStudent.name,
            rollNumber: resolvedStudent.rollNumber,
            course: resolvedStudent.class || resolvedStudent.department || 'Course',
            semester: 'Odd Sem',
            academicYear: '2025-26',
            confidence: 1.0,
          } : null,
          targetStudent: resolvedStudent?.name,
          targetCourse,
          format: 'NONE',
          rawQuery: sanitized
        });

        return {
          text: result.text,
          agent: 'FEE',
          confidenceTier: 'TIER_1_REGEX',
          resolvedStudent,
          exportPayload: result.exportPayload,
          exportFormat: result.exportFormat
        };
      }

      if (MISC_KEYWORDS.test(sanitized)) {
        return {
          text: "👋 **GRADit Assistant Capabilities:**\n\n" +
            "• **Individual Attendance:** *\"Rahul's attendance\"* or *\"Show attendance for 2025CSE019\"*\n" +
            "• **Individual Fees:** *\"What is Rahul's pending fee?\"*\n" +
            "• **Collective Attendance:** *\"Overall attendance\"* or *\"Attendance shortage list\"*\n" +
            "• **Collective Fees:** *\"Total fees collected\"* or *\"Students with pending fees\"*",
          agent: 'MISC',
          confidenceTier: 'TIER_1_REGEX'
        };
      }

      // Fallback
      return {
        text: "I couldn't quite understand that query.\n\nYou can ask about:\n• Student attendance (e.g. *\"Rahul's attendance\"*)\n• Fee status (e.g. *\"Rahul's pending fee\"*)\n• Overall attendance (e.g. *\"Overall attendance\"*)\n• Fee summaries (e.g. *\"Total fees collected\"*)",
        agent: 'UNKNOWN',
        confidenceTier: 'TIER_3_FALLBACK'
      };
    } catch (err: any) {
      console.error('[Orchestrator] Execution Error:', err);
      return {
        text: "⚠️ Unable to access student records right now. Please try again in a moment.",
        agent: 'ORCHESTRATOR',
        confidenceTier: 'TIER_3_FALLBACK',
        error: true,
      };
    }
  }
}
