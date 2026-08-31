import { supabase, supabaseAdmin, isSupabaseConfigured } from '../supabaseClient';
import { Student } from '../../lib/mockDatabase';

export interface SupabaseStudentRow {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  department_id?: string;
  class_id?: string;
  admission_year?: number | string;
  is_active?: boolean;
  created_at?: string;
}

export type QueryStatus = 'SUCCESS' | 'NOT_FOUND' | 'CONNECTION_ERROR';

export interface StudentResolutionResult {
  status: QueryStatus;
  student: Student | null;
  multipleMatches?: Student[];
  totalMatchesCount?: number;
  candidateSearched?: string;
  isAmbiguous?: boolean;
  errorMessage?: string;
}

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'for', 'of', 'and', 'to', 'in', 'a', 'an', 'show', 'tell',
  'check', 'get', 'give', 'me', 'details', 'status', 'record', 'records', 'report',
  'attendance', 'fee', 'fees', 'pending', 'due', 'paid', 'total', 'my', 'student', 'students',
  'pdf', 'excel', 'xlsx', 'docx', 'doc', 'download', 'export', 'current', 'sem', 'as',
  'semester', 'year', '2024', '2025', '2026', '2027', '2025-26', '2024-25', 'odd', 'even', 'how', 'much',
  'overall', 'collection', 'summary', 'all', 'college', 'class', 'wise', 'list', 'more', 'named', 'about'
]);

// Regex Patterns for Entity Extraction
const ROLL_NUMBER_REGEX = /\b(?:\d{4}[A-Z]{2,4}\d{2,4}|ST-?\d+|[A-Z]{2,4}\d{3,6}|\d{2,4}[A-Z]{2,4}\d*)\b/gi;
const TWO_WORD_NAME_REGEX = /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b/g;
const CONTEXTUAL_NAME_REGEX = /(?:student|for|of|about|check|show|named)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)/g;

export class StudentService {
  /**
   * Extract potential student name candidates from natural language query using Regex & Token Analysis
   */
  public static extractCandidates(query: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();

    const addCandidate = (cand: string) => {
      const trimmed = cand.trim();
      const lower = trimmed.toLowerCase();
      // Avoid stop words or candidate phrases containing purely stop words
      const words = lower.split(/\s+/);
      const isPureStopWords = words.every(w => STOP_WORDS.has(w));
      if (trimmed.length >= 2 && !isPureStopWords && !seen.has(lower)) {
        seen.add(lower);
        candidates.push(trimmed);
      }
    };

    // 1. Regex Pattern A: Exact Student Roll / Registration IDs (e.g. 2025CSE019, ST-101)
    const rollMatches = query.match(ROLL_NUMBER_REGEX);
    if (rollMatches) {
      rollMatches.forEach(m => addCandidate(m));
    }

    // 2. Regex Pattern B: Two-Word Full Names (e.g. "Rahul Sharma")
    let twoWordMatch;
    while ((twoWordMatch = TWO_WORD_NAME_REGEX.exec(query)) !== null) {
      if (twoWordMatch[1]) addCandidate(twoWordMatch[1]);
    }

    // 3. Regex Pattern C: Contextual Names following preposition / intent keywords
    let contextMatch;
    while ((contextMatch = CONTEXTUAL_NAME_REGEX.exec(query)) !== null) {
      if (contextMatch[1]) addCandidate(contextMatch[1]);
    }

    // 4. Token & Word Analysis
    const clean = query
      .replace(/['’]s\b/gi, '')
      .replace(/[<>"`\\]/g, ' ')
      .replace(/[^\w\s-]/gi, ' ')
      .trim();

    const words = clean.split(/\s+/).filter(w => w.length >= 2);

    for (const w of words) {
      const lower = w.toLowerCase();
      if (/^\d{2,4}$/.test(w)) continue;
      if (!STOP_WORDS.has(lower)) {
        addCandidate(w);
        if (w.length > 3 && (w.endsWith('s') || w.endsWith('S'))) {
          addCandidate(w.slice(0, -1));
        }
      }
    }

    return candidates;
  }

  /**
   * Fetch all active students from live public.students table
   */
  public static async getAllStudents(): Promise<{ status: QueryStatus; data: Student[] }> {
    const client = supabaseAdmin || supabase;
    if (!isSupabaseConfigured() || !client) {
      console.log('[Supabase Diagnostic] Service: studentService Source: public.students Status: ERROR Message: Supabase not configured');
      return { status: 'CONNECTION_ERROR', data: [] };
    }

    try {
      const { data, error } = await client
        .from('students')
        .select('id, student_id, first_name, last_name, email, department_id, class_id, admission_year, is_active, created_at')
        .eq('is_active', true);

      if (error) {
        console.log(`[Supabase Diagnostic] Service: studentService Source: public.students Status: ERROR Code: ${error.code} Message: ${error.message}`);
        return { status: 'CONNECTION_ERROR', data: [] };
      }

      const count = data?.length || 0;
      console.log(`[Supabase Diagnostic] Service: studentService Source: public.students Status: SUCCESS Rows: ${count}`);

      if (data && data.length > 0) {
        return {
          status: 'SUCCESS',
          data: data.map((d: SupabaseStudentRow) => ({
            id: d.id,
            rollNumber: d.student_id,
            name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
            gender: 'Not Specified',
            course: d.class_id ? `Class ${d.class_id}` : 'B.E. CSE',
            semester: 'Odd Sem',
            academicYear: d.admission_year ? `${d.admission_year}-${Number(d.admission_year) + 1}` : '2025-26',
            email: d.email || '',
            phone: '',
          }))
        };
      }

      return { status: 'NOT_FOUND', data: [] };
    } catch (err: any) {
      console.log(`[Supabase Diagnostic] Service: studentService Source: public.students Status: EXCEPTION Message: ${err.message}`);
      return { status: 'CONNECTION_ERROR', data: [] };
    }
  }

  /**
   * Find student with Regex-enhanced matching, Top 3 suggestions, and disambiguation
   */
  public static async findStudentDetailed(query: string): Promise<StudentResolutionResult> {
    if (!query) return { status: 'NOT_FOUND', student: null };
    const candidates = this.extractCandidates(query);
    const client = supabaseAdmin || supabase;

    if (!isSupabaseConfigured() || !client) {
      console.log('[Supabase Diagnostic] Service: studentService Source: public.students Status: ERROR Message: Supabase client unavailable');
      return { status: 'CONNECTION_ERROR', student: null, errorMessage: "⚠️ Unable to access student records right now. Please try again in a moment." };
    }

    if (candidates.length === 0) {
      return { status: 'NOT_FOUND', student: null };
    }

    try {
      for (const cand of candidates) {
        // Build flexible regex / partial match query
        const isMultiWord = cand.includes(' ');
        let dbQuery = client
          .from('students')
          .select('id, student_id, first_name, last_name, email, department_id, class_id, admission_year, is_active');

        if (isMultiWord) {
          const parts = cand.split(/\s+/);
          const first = parts[0];
          const last = parts.slice(1).join(' ');
          dbQuery = dbQuery.or(`and(first_name.ilike.%${first}%,last_name.ilike.%${last}%),student_id.ilike.%${cand}%`);
        } else {
          dbQuery = dbQuery.or(`student_id.ilike.%${cand}%,first_name.ilike.%${cand}%,last_name.ilike.%${cand}%`);
        }

        const { data, error } = await dbQuery.limit(10);

        if (error) {
          console.log(`[Supabase Diagnostic] Service: studentService Source: public.students Query: ${cand} Status: ERROR Code: ${error.code} Message: ${error.message}`);
          return { status: 'CONNECTION_ERROR', student: null, errorMessage: "⚠️ Unable to access student records right now. Please try again in a moment." };
        }

        const count = data?.length || 0;
        console.log(`[Supabase Diagnostic] Service: studentService Source: public.students Candidate: "${cand}" Status: SUCCESS Rows: ${count}`);

        if (data && data.length > 0) {
          const mapped: Student[] = data.map((d: SupabaseStudentRow) => ({
            id: d.id,
            rollNumber: d.student_id,
            name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
            gender: 'Not Specified',
            course: d.class_id ? `Class ${d.class_id}` : 'B.E. CSE',
            semester: 'Odd Sem',
            academicYear: d.admission_year ? `${d.admission_year}-${Number(d.admission_year) + 1}` : '2025-26',
            email: d.email || '',
            phone: '',
          }));

          if (mapped.length > 1) {
            return {
              status: 'SUCCESS',
              student: null,
              multipleMatches: mapped,
              totalMatchesCount: mapped.length,
              candidateSearched: cand,
              isAmbiguous: true,
            };
          }

          return { status: 'SUCCESS', student: mapped[0] };
        }
      }

      return { status: 'NOT_FOUND', student: null };
    } catch (err: any) {
      console.log(`[Supabase Diagnostic] Service: studentService Source: public.students Status: EXCEPTION Message: ${err.message}`);
      return { status: 'CONNECTION_ERROR', student: null, errorMessage: "⚠️ Unable to access student records right now. Please try again in a moment." };
    }
  }

  /**
   * Find single student
   */
  public static async findStudent(query: string): Promise<Student | null> {
    const result = await this.findStudentDetailed(query);
    return result.student;
  }
}
