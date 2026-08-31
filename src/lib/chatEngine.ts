import { StudentResolver, ResolvedStudent } from './studentResolver';
import { AttendanceAgent, AttendanceAgentResult } from './agents/attendanceAgent';
import { FeeAgent, FeeAgentResult, TimePeriodType, QueryScopeType, ExportFormatType } from './agents/feeAgent';
import { StudentService } from '../backend/services/studentService';
import { Student } from './mockDatabase';

export type AgentType = 'ATTENDANCE' | 'FEE' | 'MISC' | 'ORCHESTRATOR' | 'UNKNOWN';

export interface ChatMessageResponse {
  text: string;
  agent: AgentType;
  confidenceTier: 'TIER_1_REGEX' | 'TIER_2_FUZZY' | 'TIER_3_FALLBACK';
  resolvedStudent?: ResolvedStudent;
  exportPayload?: any;
  exportFormat?: ExportFormatType;
  quickActions?: { label: string; query: string }[];
  error?: boolean;
}

// 1. TIER 1 - DETERMINISTIC REGEX DICTIONARIES
const ATTENDANCE_KEYWORDS = /\b(attendance|present|absent|shortage|classes|attended|bunk|eligibility|percentage|lectures|sessions)\b/i;
const FEE_KEYWORDS = /\b(fee|fees|paid|due|dues|balance|pending|receipt|tuition|installment|scholarship|payment|statement|invoice)\b/i;
const MISC_KEYWORDS = /\b(help|what can you do|commands|options|hello|hi|hey|greetings|clear|who are you|reset)\b/i;
const LIST_ALL_REGEX = /\b(list all|show all|show more|all students|more for)\b/i;

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
   * Sanitizes input to prevent regex injection or malicious payload execution
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
   * Extracts target time period
   */
  private static extractPeriod(query: string): TimePeriodType {
    for (const [period, regex] of Object.entries(PERIOD_PATTERNS) as [TimePeriodType, RegExp][]) {
      if (regex.test(query)) {
        return period;
      }
    }
    return 'CURRENT_SEM';
  }

  /**
   * Extracts query scope (SOLO, AGGREGATE, OVERDUE)
   */
  private static extractScope(query: string, hasResolvedStudent: boolean): QueryScopeType {
    if (SCOPE_REGEX.OVERDUE.test(query)) return 'OVERDUE';
    if (SCOPE_REGEX.AGGREGATE.test(query) && !hasResolvedStudent) return 'AGGREGATE';
    if (hasResolvedStudent) return 'SOLO';
    return 'SOLO';
  }

  /**
   * Extracts export format
   */
  private static extractFormat(query: string): ExportFormatType {
    if (EXPORT_REGEX.PDF.test(query)) return 'PDF';
    if (EXPORT_REGEX.XLSX.test(query)) return 'XLSX';
    if (EXPORT_REGEX.DOCS.test(query)) return 'DOCS';
    return 'NONE';
  }

  /**
   * Extracts targeted course or department
   */
  private static extractCourse(query: string): string | undefined {
    for (const [courseName, regex] of Object.entries(COURSE_PATTERNS)) {
      if (regex.test(query)) {
        return courseName;
      }
    }
    return undefined;
  }

  /**
   * Tier 2: Fuzzy keyword and intent matching
   */
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

    // Step 1: Student Resolver (Queries Supabase public.students with Regex & Token Matching)
    const detailedResolution = await StudentResolver.resolveDetailed(sanitized);

    if (detailedResolution.status === 'CONNECTION_ERROR') {
      return {
        text: "⚠️ Unable to access student records right now. Please try again in a moment.",
        agent: 'ORCHESTRATOR',
        confidenceTier: 'TIER_1_REGEX',
      };
    }

    // Handle "Show all / List all" for first/last name searches
    const isListAllQuery = LIST_ALL_REGEX.test(sanitized);

    // If multiple students match (Ambiguous First/Last Name Search with Top 3 Suggestions & Show More)
    if (detailedResolution.isAmbiguous && detailedResolution.multipleMatches && detailedResolution.multipleMatches.length > 1) {
      const allMatches = detailedResolution.multipleMatches;
      const candidateName = detailedResolution.candidateSearched || allMatches[0].name.split(' ')[0];
      const intentSuffix = ATTENDANCE_KEYWORDS.test(sanitized) ? 'attendance' : FEE_KEYWORDS.test(sanitized) ? 'fee' : 'details';

      // If user specifically requested to view all matching records
      if (isListAllQuery) {
        let fullListText = `📋 **All ${allMatches.length} students matching "${candidateName}":**\n\n`;
        const fullQuickActions: { label: string; query: string }[] = [];

        allMatches.forEach((st, idx) => {
          fullListText += `${idx + 1}. **${st.name}** — \`${st.rollNumber}\` (${st.course})\n`;
          fullQuickActions.push({
            label: `${st.name} (${st.rollNumber})`,
            query: `Show ${st.rollNumber} ${intentSuffix}`,
          });
        });

        return {
          text: fullListText,
          agent: 'ORCHESTRATOR',
          confidenceTier: 'TIER_1_REGEX',
          quickActions: fullQuickActions,
        };
      }

      // Default Top 3 Suggestions view
      const top3 = allMatches.slice(0, 3);
      const remainingCount = allMatches.length - top3.length;

      let ambText = `🔍 I found **${allMatches.length} students** matching "**${candidateName}**".\n\n` +
        `**Top 3 Suggested Matches:**\n`;

      const quickActions: { label: string; query: string }[] = [];

      top3.forEach((st, idx) => {
        ambText += `${idx + 1}. **${st.name}** — \`${st.rollNumber}\` (${st.course})\n`;
        quickActions.push({
          label: `${st.name} (${st.rollNumber})`,
          query: `Show ${st.rollNumber} ${intentSuffix}`,
        });
      });

      if (remainingCount > 0) {
        ambText += `\n*...and ${remainingCount} more students found for "${candidateName}".*\nClick below to expand all:`;
        quickActions.push({
          label: `🔍 Show more (${remainingCount} more for "${candidateName}")`,
          query: `List all students named ${candidateName}`,
        });
      }

      return {
        text: ambText,
        agent: 'ORCHESTRATOR',
        confidenceTier: 'TIER_1_REGEX',
        quickActions,
      };
    }

    const resolvedStudent = detailedResolution.resolvedStudent;
    const candidates = StudentService.extractCandidates(rawInput);
    
    // Check if query is looking for a specific individual (has name candidates or explicit solo keywords)
    const isExplicitSolo = /['’]s|\bfor\b|\bof\b|\bstudent\b/i.test(rawInput) || /\b(my|i|me|mine)\b/i.test(sanitized) || candidates.length > 0;
    const targetStudent = resolvedStudent ? resolvedStudent.name : candidates.length > 0 ? candidates.join(' ') : undefined;

    // Step 2: Extract Modifiers
    const format = this.extractFormat(sanitized);
    const period = this.extractPeriod(sanitized);
    const scope = this.extractScope(sanitized, Boolean(resolvedStudent || targetStudent));
    const targetCourse = this.extractCourse(sanitized);

    // Step 3: Tier 1 Regex Matching
    let targetAgent: AgentType = 'UNKNOWN';
    let confidenceTier: 'TIER_1_REGEX' | 'TIER_2_FUZZY' | 'TIER_3_FALLBACK' = 'TIER_1_REGEX';

    if (ATTENDANCE_KEYWORDS.test(sanitized)) {
      targetAgent = 'ATTENDANCE';
    } else if (FEE_KEYWORDS.test(sanitized)) {
      targetAgent = 'FEE';
    } else if (MISC_KEYWORDS.test(sanitized)) {
      targetAgent = 'MISC';
    }

    // Step 4: Tier 2 Fuzzy Matching
    if (targetAgent === 'UNKNOWN') {
      const fuzzyMatch = await this.matchIntentTier2(sanitized);
      if (fuzzyMatch) {
        targetAgent = fuzzyMatch.agent;
        confidenceTier = 'TIER_2_FUZZY';
      } else if (resolvedStudent || targetStudent) {
        targetAgent = 'ATTENDANCE';
        confidenceTier = 'TIER_1_REGEX';
      }
    }

    // Step 5: Delegate to Specialized Sub-Agents
    try {
      if (targetAgent === 'ATTENDANCE') {
        const result: AttendanceAgentResult = await AttendanceAgent.execute({
          userId,
          period,
          scope,
          resolvedStudent,
          targetStudent,
          targetCourse,
          format,
          rawQuery: sanitized
        });

        return {
          text: result.text,
          agent: 'ATTENDANCE',
          confidenceTier,
          resolvedStudent: resolvedStudent || undefined,
          exportPayload: result.exportPayload,
          exportFormat: result.exportFormat
        };
      }

      if (targetAgent === 'FEE') {
        const result: FeeAgentResult = await FeeAgent.execute({
          userId,
          period,
          scope,
          resolvedStudent,
          targetStudent,
          targetCourse,
          format,
          rawQuery: sanitized
        });

        return {
          text: result.text,
          agent: 'FEE',
          confidenceTier,
          resolvedStudent: resolvedStudent || undefined,
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
