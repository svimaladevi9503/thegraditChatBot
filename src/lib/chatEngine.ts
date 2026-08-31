import { createClient } from '@supabase/supabase-js';
import { FeeAgent, FeeAgentResult, TimePeriodType, QueryScopeType, ExportFormatType } from './agents/feeAgent';
import { AttendanceAgent, AttendanceAgentResult } from './agents/attendanceAgent';
import { MiscAgent, MiscAgentResult } from './agents/miscAgent';
import { StudentResolver, ResolvedStudent } from './studentResolver';
import { ExportDataPayload } from './exportUtils';

export type AgentType = 'ORCHESTRATOR' | 'FEE' | 'ATTENDANCE' | 'MISC' | 'UNKNOWN';

export interface ChatMessageResponse {
  text: string;
  agent: AgentType;
  actionType?: string;
  confidenceTier: 'TIER_1_REGEX' | 'TIER_2_FUZZY' | 'TIER_3_FALLBACK';
  resolvedStudent?: ResolvedStudent | null;
  summary?: any;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  exportPayload?: ExportDataPayload;
  exportFormat?: ExportFormatType;
  quickActions?: { label: string; query: string }[];
  error?: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// =========================================================
// Tier 1: Deterministic Regular Expressions
// =========================================================

const FEE_KEYWORDS = /\b(fee|fees|tuition|dues|due|payment|paid|receipt|invoice|fine|scholarship|balance|cost|financial)\b/i;
const ATTENDANCE_KEYWORDS = /\b(attendance|present|absent|leave|classes|lecture|lectures|sessions|percentage|eligibility|exam eligibility|hall ticket|shortage)\b/i;
const MISC_KEYWORDS = /\b(staff|faculty|teacher|professor|student|students|boy|boys|girl|girls|course|courses|placement|placements|resume|hr|partner|campus|college|solar|power|roof)\b/i;

// Format Intent Extractors
const FORMAT_REGEX = {
  PDF: /\b(pdf|download pdf|export pdf|print receipt|document)\b/i,
  XLSX: /\b(excel|xlsx|xls|spreadsheet|sheet|csv)\b/i,
  DOCS: /\b(doc|docx|word|word doc|text doc)\b/i,
};

// Period Intent Extractors (including 2025-26, odd, even)
const PERIOD_REGEX = {
  YEAR_25_26: /\b(2025-26|2025-2026|2025|2026)\b/i,
  ODD: /\b(odd|odd sem|odd semester|current sem|this sem|current semester|sem 1|sem 3|sem 5|sem 7)\b/i,
  EVEN: /\b(even|even sem|even semester|last sem|prev sem|previous sem|sem 2|sem 4|sem 6|sem 8)\b/i,
  ALL: /\b(all|total|overall|aggregate|annual|yearly|cumulative)\b/i,
  MONTH: /\b(month|this month|august|september|october)\b/i,
};

// Scope Intent Extractors
const SCOPE_REGEX = {
  AGGREGATE: /\b(total|all|overall|aggregate|college|class wise|class-wise|department|dept|whole|summary)\b/i,
  OVERDUE: /\b(overdue|pending|unpaid|defaulter|defaulters|shortage|short)\b/i,
  SOLO: /\b(my|i|me|mine|student|solo|personal|individual)\b/i,
};

// Course Extractors
const KNOWN_COURSES = [
  'Architecture', 'B.Com Accounts', 'B.Com Finance', 'B.E. CSE', 
  'B.E. IT', 'Construction Management', 'MBA. HR', 'MBA HR EVS', 'Staff Grp 1'
];

export class OrchestratorAgent {
  public static sanitizeInput(input: string): string {
    if (!input) return '';
    return input.replace(/[<>'"`;\\]/g, '').trim();
  }

  private static extractFormat(query: string): ExportFormatType {
    if (FORMAT_REGEX.PDF.test(query)) return 'PDF';
    if (FORMAT_REGEX.XLSX.test(query)) return 'XLSX';
    if (FORMAT_REGEX.DOCS.test(query)) return 'DOCS';
    return 'NONE';
  }

  private static extractPeriod(query: string): TimePeriodType | string {
    if (PERIOD_REGEX.YEAR_25_26.test(query)) return 'YEAR_2025_26';
    if (PERIOD_REGEX.ODD.test(query)) return 'ODD_SEM';
    if (PERIOD_REGEX.EVEN.test(query)) return 'EVEN_SEM';
    if (PERIOD_REGEX.MONTH.test(query)) return 'MONTH';
    if (PERIOD_REGEX.ALL.test(query)) return 'ALL_TIME';
    return 'CURRENT_SEM';
  }

  private static extractScope(query: string, hasResolvedStudent: boolean): QueryScopeType {
    if (hasResolvedStudent) return 'SOLO';
    if (SCOPE_REGEX.OVERDUE.test(query)) return 'OVERDUE';
    if (SCOPE_REGEX.SOLO.test(query)) return 'SOLO';
    if (SCOPE_REGEX.AGGREGATE.test(query)) return 'AGGREGATE';
    return 'AGGREGATE';
  }

  private static extractCourse(query: string): string | undefined {
    const qLower = query.toLowerCase();
    for (const c of KNOWN_COURSES) {
      if (qLower.includes(c.toLowerCase()) || qLower.includes(c.toLowerCase().replace('.', ''))) {
        return c;
      }
    }
    if (qLower.includes('cse') || qLower.includes('computer science')) return 'B.E. CSE';
    if (qLower.includes('it') || qLower.includes('information tech')) return 'B.E. IT';
    if (qLower.includes('bcom') || qLower.includes('commerce')) return 'B.Com Accounts';
    if (qLower.includes('mba') || qLower.includes('management')) return 'MBA. HR';
    if (qLower.includes('arch') || qLower.includes('architecture')) return 'Architecture';
    return undefined;
  }

  private static async matchIntentTier2(query: string): Promise<{ agent: AgentType; action: string } | null> {
    const qLower = query.toLowerCase();

    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('match_user_intent', { 
          search_query: query,
          similarity_threshold: 0.30 
        });
        if (!error && data && data.length > 0) {
          return { agent: data[0].agent_type as AgentType, action: data[0].action_type };
        }
      } catch (err) {
        console.warn('Supabase intent matching skipped:', err);
      }
    }

    // High performance local fallback
    const localIntents = [
      { agent: 'FEE' as AgentType, phrase: 'total fee collected this semester', action: 'GET_AGGREGATE' },
      { agent: 'FEE' as AgentType, phrase: 'what is my pending fee balance', action: 'GET_SOLO' },
      { agent: 'FEE' as AgentType, phrase: 'download fee receipt in pdf', action: 'EXPORT_REPORT' },
      { agent: 'FEE' as AgentType, phrase: 'export fee report as excel xlsx', action: 'EXPORT_REPORT' },
      { agent: 'ATTENDANCE' as AgentType, phrase: 'overall college attendance this semester', action: 'GET_AGGREGATE' },
      { agent: 'ATTENDANCE' as AgentType, phrase: 'what is my current attendance percentage', action: 'GET_SOLO' },
      { agent: 'ATTENDANCE' as AgentType, phrase: 'what is rahuls attendance for 2025-26', action: 'GET_SOLO' },
      { agent: 'ATTENDANCE' as AgentType, phrase: 'am i eligible for exams based on attendance', action: 'GET_SOLO' },
      { agent: 'ATTENDANCE' as AgentType, phrase: 'export attendance sheet as excel', action: 'EXPORT_REPORT' },
      { agent: 'MISC' as AgentType, phrase: 'total students and staff count in college', action: 'GET_STATS' },
      { agent: 'MISC' as AgentType, phrase: 'power the future solar panels partner', action: 'GET_PLACEMENT' }
    ];

    let bestScore = 0;
    let bestMatch: { agent: AgentType; action: string } | null = null;

    for (const item of localIntents) {
      const score = this.calculateSimilarity(qLower, item.phrase.toLowerCase());
      if (score > bestScore && score >= 0.25) {
        bestScore = score;
        bestMatch = { agent: item.agent, action: item.action };
      }
    }

    return bestMatch;
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const getTrigrams = (s: string) => {
      const padded = `  ${s} `;
      const trigrams = new Set<string>();
      for (let i = 0; i < padded.length - 2; i++) {
        trigrams.add(padded.substring(i, i + 3));
      }
      return trigrams;
    };

    const tri1 = getTrigrams(str1);
    const tri2 = getTrigrams(str2);
    let intersection = 0;
    tri1.forEach(t => {
      if (tri2.has(t)) intersection++;
    });

    const union = tri1.size + tri2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Main Pipeline:
   * Faculty/User Input -> Sanitization -> Student Resolver -> Tier 1/2 Matcher -> Fee/Attendance Agent -> DB Output
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

    // Step 1: Student Resolver (Identifies entities like 'Rahul', 'Aditya', '2025CSE019')
    const resolvedStudent = StudentResolver.resolve(sanitized);

    // Step 2: Extract Modifiers
    const format = this.extractFormat(sanitized);
    const period = this.extractPeriod(sanitized);
    const scope = this.extractScope(sanitized, Boolean(resolvedStudent));
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
      } else if (resolvedStudent) {
        // If student is identified without explicit keyword, default to Attendance/Overview
        targetAgent = 'ATTENDANCE';
        confidenceTier = 'TIER_1_REGEX';
      }
    }

    // Step 5: Delegate to Specialized Sub-Agents
    try {
      if (targetAgent === 'ATTENDANCE') {
        const result = AttendanceAgent.execute({
          userId,
          period,
          scope,
          resolvedStudent,
          targetCourse,
          format,
          rawQuery: sanitized
        });
        return {
          ...result,
          confidenceTier,
          resolvedStudent,
          quickActions: [
            { label: 'Download Transcript (PDF)', query: `${sanitized} in pdf` },
            { label: 'Export Sheet (Excel)', query: `${sanitized} in excel` },
            { label: 'Check Fee Balance', query: resolvedStudent ? `What is ${resolvedStudent.name.split(' ')[0]}'s pending fee?` : 'What is my pending fee?' },
          ]
        };
      }

      if (targetAgent === 'FEE') {
        const result = FeeAgent.execute({
          userId,
          period,
          scope,
          resolvedStudent,
          targetCourse,
          format,
          rawQuery: sanitized
        });
        return {
          ...result,
          confidenceTier,
          resolvedStudent,
          quickActions: [
            { label: 'Download Receipt (PDF)', query: `${sanitized} in pdf` },
            { label: 'Export Statement (Excel)', query: `${sanitized} in excel` },
            { label: 'Attendance Record', query: resolvedStudent ? `What is ${resolvedStudent.name.split(' ')[0]}'s attendance?` : 'What is my attendance?' },
          ]
        };
      }

      if (targetAgent === 'MISC') {
        const result = MiscAgent.execute({ rawQuery: sanitized });
        return {
          ...result,
          confidenceTier,
          resolvedStudent,
        };
      }

      // Step 6: Tier 3 Fallback
      return {
        text: `🤔 I couldn't match your query directly to our Fee or Attendance catalogs.\n\n` +
          `**Try asking one of these verified questions:**\n` +
          `• 📋 *"What is Rahul's attendance for 2025-26?"*\n` +
          `• 💳 *"What is Priya's pending fee balance in pdf?"*\n` +
          `• 📈 *"Class-wise attendance percentage report as excel"*\n` +
          `• 📊 *"Total fees collected this semester"*`,
        agent: 'ORCHESTRATOR',
        confidenceTier: 'TIER_3_FALLBACK',
        quickActions: [
          { label: "Rahul's Attendance 2025-26", query: "What is Rahul's attendance for 2025-26?" },
          { label: "Total Students Count", query: "Total students in college" },
          { label: "Odd Sem Fee Summary", query: "Total fees collected odd sem" },
        ]
      };
    } catch (err: any) {
      console.error('[Orchestrator Error]:', err);
      return {
        text: 'An error occurred while executing the agent query.',
        agent: 'ORCHESTRATOR',
        confidenceTier: 'TIER_3_FALLBACK',
        error: true
      };
    }
  }
}
