import { StudentResolver, StudentResolutionContract, StudentMatchItem } from './studentResolver';
import { AttendanceAgent, AttendanceAgentResult } from './agents/attendanceAgent';
import { FeeAgent, FeeAgentResult, TimePeriodType, QueryScopeType, ExportFormatType } from './agents/feeAgent';
import { StudentService } from '../backend/services/studentService';

export type AgentType = 'ATTENDANCE' | 'FEE' | 'MISC' | 'ORCHESTRATOR' | 'UNKNOWN';

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

// 1. TIER 1 - DETERMINISTIC REGEX DICTIONARIES
const ATTENDANCE_KEYWORDS = /\b(attendance|present|absent|shortage|classes|attended|bunk|eligibility|percentage|lectures|sessions)\b/i;
const FEE_KEYWORDS = /\b(fee|fees|paid|due|dues|balance|pending|receipt|tuition|installment|scholarship|payment|statement|invoice)\b/i;
const MISC_KEYWORDS = /\b(help|what can you do|commands|options|hello|hi|hey|greetings|clear|who are you|reset)\b/i;
const SHOW_MORE_REGEX = /\b(show more|list all|all .* students|show all .* students|more for)\b/i;

// 2. TIME PERIOD REGEX PATTERNS
const PERIOD_PATTERNS: Record<TimePeriodType, RegExp> = {
  CURRENT_SEM: /\b(current sem|current semester|this semester|this sem|odd sem|odd semester)\b/i,
  ODD_SEM: /\b(odd sem|odd semester|semester 1|sem 1|semester 3|sem 3|semester 5|sem 5|semester 7|sem 7)\b/i,
  EVEN_SEM: /\b(even sem|even semester|semester 2|sem 2|semester 4|sem 4|semester 6|sem 6|semester 8|sem 8)\b/i,
  PREV_SEM: /\b(last sem|last semester|previous sem|previous semester)\b/i,
  MONTH: /\b(this month|last month|current month|monthly)\b/i,
  ALL_TIME: /\b(overall|all time|total|cumulative|complete|history)\b/i,
  YEAR_2025_26: /\b(2025-26|2025|2026|academic year 2025-26)\b/i,
};

// 3. SCOPE REGEX PATTERNS
const SCOPE_REGEX = {
  AGGREGATE: /\b(overall|average|class average|batch|department|dept|branch|college|institution|entire|all students|collection summary)\b/i,
  OVERDUE: /\b(overdue|defaulter|defaulters|unpaid|shortage list|below 75|detained)\b/i,
};

// 4. EXPORT INTENT REGEX PATTERNS
const EXPORT_REGEX = {
  PDF: /\b(pdf|download pdf|export pdf|print pdf|save as pdf)\b/i,
  XLSX: /\b(excel|xlsx|spreadsheet|csv|export excel|download sheet)\b/i,
  DOCS: /\b(word|doc|docx|document|export doc)\b/i,
};

// 5. COURSE & DEPARTMENT EXTRACTION
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
   * Sanitizes input to prevent injection
   */
  public static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .trim()
      .slice(0, 300)
      .replace(/[<>"`\\]/g, '')
      .replace(/\s+/g, ' ');
  }

  private static extractPeriod(query: string): TimePeriodType {
    for (const [period, regex] of Object.entries(PERIOD_PATTERNS) as [TimePeriodType, RegExp][]) {
      if (regex.test(query)) {
        return period;
      }
    }
    return 'CURRENT_SEM';
  }

  private static extractScope(query: string, hasResolvedStudent: boolean): QueryScopeType {
    if (SCOPE_REGEX.OVERDUE.test(query)) return 'OVERDUE';
    if (SCOPE_REGEX.AGGREGATE.test(query) && !hasResolvedStudent) return 'AGGREGATE';
    return 'SOLO';
  }

  private static extractFormat(query: string): ExportFormatType {
    if (EXPORT_REGEX.PDF.test(query)) return 'PDF';
    if (EXPORT_REGEX.XLSX.test(query)) return 'XLSX';
    if (EXPORT_REGEX.DOCS.test(query)) return 'DOCS';
    return 'NONE';
  }

  private static extractCourse(query: string): string | undefined {
    for (const [courseName, regex] of Object.entries(COURSE_PATTERNS)) {
      if (regex.test(query)) {
        return courseName;
      }
    }
    return undefined;
  }

  private static async matchIntentTier2(query: string): Promise<{ agent: AgentType; confidence: number } | null> {
    const clean = query.toLowerCase();

    if (clean.includes('att') || clean.includes('present') || clean.includes('absent') || clean.includes('classes') || clean.includes('percent')) {
      return { agent: 'ATTENDANCE', confidence: 0.85 };
    }
    if (clean.includes('fee') || clean.includes('pay') || clean.includes('dues') || clean.includes('pend') || clean.includes('cost') || clean.includes('money')) {
      return { agent: 'FEE', confidence: 0.85 };
    }
    if (clean.includes('help') || clean.includes('what') || clean.includes('how') || clean.includes('menu')) {
      return { agent: 'MISC', confidence: 0.80 };
    }

    return null;
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

    // Step 1: Detect Intent
    const isAttendanceIntent = ATTENDANCE_KEYWORDS.test(sanitized);
    const isFeeIntent = FEE_KEYWORDS.test(sanitized);
    const intentSuffix = isAttendanceIntent ? 'attendance' : isFeeIntent ? 'pending fee' : 'details';

    // Step 2: Student Resolution via Deterministic Hierarchy
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

    // Case B: AMBIGUOUS (Multiple Students Match -> NEVER Select Automatically)
    if (resolution.status === 'AMBIGUOUS' && resolution.matches && resolution.matches.length > 1) {
      const allMatches = resolution.matches;
      const searchTerm = resolution.searchTerm;
      const isShowMore = SHOW_MORE_REGEX.test(sanitized);

      // If user clicked "Show More" / "Show all {name} students", render remaining (matches 4 onwards)
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

    // Step 3: Check Candidate Presence for Solo vs Aggregate Scoping
    const candidates = StudentService.extractCandidates(rawInput);
    const isExplicitSolo = /['’]s|\bfor\b|\bof\b|\bstudent\b/i.test(rawInput) || /\b(my|i|me|mine)\b/i.test(sanitized) || candidates.length > 0;
    
    // Case C: NOT_FOUND for an individual student search
    if (resolution.status === 'NOT_FOUND' && isExplicitSolo && !SCOPE_REGEX.AGGREGATE.test(sanitized)) {
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

    // Step 4: Extract Modifiers
    const format = this.extractFormat(sanitized);
    const period = this.extractPeriod(sanitized);
    const scope = this.extractScope(sanitized, Boolean(resolvedStudent));
    const targetCourse = this.extractCourse(sanitized);

    // Step 5: Route to Target Agent
    let targetAgent: AgentType = 'UNKNOWN';
    let confidenceTier: 'TIER_1_REGEX' | 'TIER_2_FUZZY' | 'TIER_3_FALLBACK' = 'TIER_1_REGEX';

    if (isAttendanceIntent) {
      targetAgent = 'ATTENDANCE';
    } else if (isFeeIntent) {
      targetAgent = 'FEE';
    } else if (MISC_KEYWORDS.test(sanitized)) {
      targetAgent = 'MISC';
    }

    if (targetAgent === 'UNKNOWN') {
      const fuzzyMatch = await this.matchIntentTier2(sanitized);
      if (fuzzyMatch) {
        targetAgent = fuzzyMatch.agent;
        confidenceTier = 'TIER_2_FUZZY';
      } else if (resolvedStudent) {
        targetAgent = 'ATTENDANCE';
        confidenceTier = 'TIER_1_REGEX';
      }
    }

    // Step 6: Delegate to Sub-Agents (Only with Resolved Student or Valid Aggregate Query)
    try {
      if (targetAgent === 'ATTENDANCE') {
        const result: AttendanceAgentResult = await AttendanceAgent.execute({
          userId,
          period,
          scope,
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
          format,
          rawQuery: sanitized
        });

        return {
          text: result.text,
          agent: 'ATTENDANCE',
          confidenceTier,
          resolvedStudent,
          exportPayload: result.exportPayload,
          exportFormat: result.exportFormat
        };
      }

      if (targetAgent === 'FEE') {
        const result: FeeAgentResult = await FeeAgent.execute({
          userId,
          period,
          scope,
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
          format,
          rawQuery: sanitized
        });

        return {
          text: result.text,
          agent: 'FEE',
          confidenceTier,
          resolvedStudent,
          exportPayload: result.exportPayload,
          exportFormat: result.exportFormat
        };
      }

      if (targetAgent === 'MISC') {
        return {
          text: "👋 **GRADit Assistant Capabilities:**\n\n" +
            "• **Student Attendance:** Check course attendance, shortage alerts, and exam eligibility (e.g. *\"Rahul's attendance\"* or *\"Show attendance for 2025CSE019\"*)\n" +
            "• **Fee Statements:** Query pending dues, paid amounts, and due dates (e.g. *\"What is Rahul's pending fee?\"*)\n" +
            "• **Institutional Reports:** View aggregate stats (e.g. *\"Overall attendance\"* or *\"Fee collection summary\"*)\n" +
            "• **Export Support:** Add *\"as PDF\"* or *\"as Excel\"* to generate downloadable transcripts.",
          agent: 'MISC',
          confidenceTier: 'TIER_1_REGEX'
        };
      }

      // Tier 3 Fallback
      return {
        text: "I couldn't quite understand that query.\n\nYou can ask about:\n• Student attendance (e.g. *\"Rahul's attendance\"*)\n• Fee status (e.g. *\"Rahul's pending fee\"*)\n• Class/College summaries (e.g. *\"Overall attendance\"*)",
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
