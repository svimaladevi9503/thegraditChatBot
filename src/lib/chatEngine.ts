import { StudentResolver, StudentResolutionContract } from './studentResolver';
import { AttendanceAgent, AttendanceAgentResult } from './agents/attendanceAgent';
import { FeeAgent, FeeAgentResult, ExportFormatType } from './agents/feeAgent';
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
const COLLECTIVE_ATTENDANCE_REGEX = /\b(overall attendance|class wise attendance|class attendance|department attendance|attendance summary|show attendance summary|average attendance|attendance shortage|shortage list|students below|students with attendance below|eligible students|how many.*eligible|students eligible|attendance report|attendance audit|who is not eligible|exam eligibility|detained students)\b/i;
const COLLECTIVE_FEE_REGEX = /\b(show pending fees|show pending fee|pending fees|pending fee summary|pending fee|pending dues|total fees collected|total fee collected|total fees|fee collection summary|fee collection|overall fee collection|overall fees|overall fee|outstanding fees|outstanding fee|total outstanding|students with pending fees|students with pending fee|who has pending fees|who has not paid|unpaid students|defaulter list|paid vs pending|fee report|how much.*pending|how much.*is pending)\b/i;

const INDIVIDUAL_ATTENDANCE_KEYWORDS = /\b(attendance|present|absent|classes|attended|bunk|eligibility|percentage|lectures|sessions)\b/i;
const INDIVIDUAL_FEE_KEYWORDS = /\b(fee|fees|paid|due|dues|balance|pending|receipt|tuition|installment|scholarship|payment|statement|invoice)\b/i;
const MISC_KEYWORDS = /\b(help|what can you do|commands|options|hello|hi|hey|greetings|clear|who are you|reset)\b/i;
const SHOW_MORE_REGEX = /\b(show more|list all|all .* students|show all .* students|more for)\b/i;

// Explicit Student Evidence Patterns
const ROLL_NUMBER_REGEX = /\b(?:\d{4}[A-Z]{2,4}\d{2,4}|ST-?\d+|[A-Z]{2,4}\d{3,6}|\d{2,4}[A-Z]{2,4}\d*)\b/i;
const POSSESSIVE_REGEX = /\b[A-Za-z]{2,}['’]s\b/i;
const TWO_WORD_NAME_REGEX = /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/;
const CONTEXTUAL_PREP_REGEX = /\b(?:student|for|of|about|named)\s+[A-Z][a-z]{2,}\b/i;

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
   * Checks whether the query has an explicit student reference
   */
  public static hasExplicitStudentReference(query: string, candidates: string[]): boolean {
    if (candidates.length === 0) return false;
    
    // Explicit roll number (e.g. 2025CSE019, ST-101)
    if (ROLL_NUMBER_REGEX.test(query)) return true;
    
    // Explicit possessive (e.g. Rahul's attendance, Priya's pending fee)
    if (POSSESSIVE_REGEX.test(query)) return true;
    
    // Explicit two-word capitalized name (e.g. Rahul Sharma)
    if (TWO_WORD_NAME_REGEX.test(query)) return true;
    
    // Explicit contextual preposition (e.g. for Rahul, of Priya, student Rahul)
    if (CONTEXTUAL_PREP_REGEX.test(query)) return true;

    // Single standalone candidate when query is not collective
    const isCollective = COLLECTIVE_ATTENDANCE_REGEX.test(query) || COLLECTIVE_FEE_REGEX.test(query);
    if (!isCollective && candidates.length > 0) return true;

    return false;
  }

  /**
   * Classifies query into clean intent categories with strict collective priority
   */
  public static classifyIntent(query: string, candidates: string[]): QueryIntentCategory {
    const clean = query.toLowerCase();
    const hasStudent = this.hasExplicitStudentReference(query, candidates);

    // 1. Conflict Rule: If explicit student reference exists, individual student intent takes precedence
    if (hasStudent) {
      if (INDIVIDUAL_ATTENDANCE_KEYWORDS.test(clean)) return 'INDIVIDUAL_ATTENDANCE';
      if (INDIVIDUAL_FEE_KEYWORDS.test(clean)) return 'INDIVIDUAL_FEE';
      return 'STUDENT_LOOKUP';
    }

    // 2. Explicit Collective Attendance
    if (COLLECTIVE_ATTENDANCE_REGEX.test(clean)) {
      return 'COLLECTIVE_ATTENDANCE';
    }

    // 3. Explicit Collective Fees
    if (COLLECTIVE_FEE_REGEX.test(clean)) {
      return 'COLLECTIVE_FEE';
    }

    // 4. Help & Miscellaneous Capabilities
    if (MISC_KEYWORDS.test(clean)) {
      return 'MISC';
    }

    // 5. Fallback Collective Keywords (when no student is present)
    if (INDIVIDUAL_ATTENDANCE_KEYWORDS.test(clean)) {
      return 'COLLECTIVE_ATTENDANCE';
    }
    if (INDIVIDUAL_FEE_KEYWORDS.test(clean)) {
      return 'COLLECTIVE_FEE';
    }

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
    const hasStudent = this.hasExplicitStudentReference(sanitized, candidates);
    const intent = this.classifyIntent(sanitized, candidates);

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
          "• **Collective Fees:** *\"Show pending fees\"* or *\"Total fees collected\"*",
        agent: 'MISC',
        confidenceTier: 'TIER_1_REGEX'
      };
    }

    // =========================================================================
    // 🔴 ROUTING PRIORITY 2 — INDIVIDUAL STUDENT RESOLUTION (Only when student candidate exists)
    // =========================================================================
    if (hasStudent || candidates.length > 0) {
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
      if (resolution.status === 'NOT_FOUND') {
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

    // =========================================================================
    // 🔴 ROUTING PRIORITY 3 — GENERAL / UNKNOWN FALLBACK
    // =========================================================================
    return {
      text: "I couldn't quite understand that query.\n\nYou can ask about:\n• Student attendance (e.g. *\"Rahul's attendance\"*)\n• Fee status (e.g. *\"Rahul's pending fee\"*)\n• Overall attendance (e.g. *\"Overall attendance\"*)\n• Fee summaries (e.g. *\"Show pending fees\"*)",
      agent: 'UNKNOWN',
      confidenceTier: 'TIER_3_FALLBACK'
    };
  }
}
