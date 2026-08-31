import { supabase, supabaseAdmin, isSupabaseConfigured } from '../supabaseClient';

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
  departments?: { name: string; code: string };
  classes?: { name: string; section: string };
}

export interface StudentEntity {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  name: string;
  department?: string;
  class?: string;
  email?: string;
}

export type QueryStatus = 'SUCCESS' | 'NOT_FOUND' | 'CONNECTION_ERROR';

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'for', 'of', 'and', 'to', 'in', 'a', 'an', 'show', 'tell',
  'check', 'get', 'give', 'me', 'details', 'status', 'record', 'records', 'report',
  'attendance', 'fee', 'fees', 'pending', 'due', 'paid', 'total', 'my', 'student', 'students',
  'pdf', 'excel', 'xlsx', 'docx', 'doc', 'download', 'export', 'current', 'sem', 'as',
  'semester', 'year', '2024', '2025', '2026', '2027', '2025-26', '2024-25', 'odd', 'even', 'how', 'much',
  'overall', 'collection', 'summary', 'all', 'college', 'class', 'wise', 'list', 'more', 'named', 'about',
  'please', 'can', 'you', 'give', 'info', 'information', 'check', 'view'
]);

// Lightweight defensive candidate extraction regex patterns
const ROLL_NUMBER_REGEX = /\b(?:\d{4}[A-Z]{2,4}\d{2,4}|ST-?\d+|[A-Z]{2,4}\d{3,6}|\d{2,4}[A-Z]{2,4}\d*)\b/gi;
const TWO_WORD_NAME_REGEX = /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b/g;
const CONTEXTUAL_NAME_REGEX = /(?:student|for|of|about|check|show|named)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)/g;

export class StudentService {
  /**
   * Defensive regex candidate extraction layer (Extracts candidates ONLY, never decides the student)
   */
  public static extractCandidates(query: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();

    const addCandidate = (cand: string) => {
      const trimmed = cand.trim();
      const lower = trimmed.toLowerCase();
      const words = lower.split(/\s+/);
      const isPureStopWords = words.every(w => STOP_WORDS.has(w));
      if (trimmed.length >= 2 && !isPureStopWords && !seen.has(lower)) {
        seen.add(lower);
        candidates.push(trimmed);
      }
    };

    // 1. Exact Roll / Registration Numbers (e.g. 2025CSE019, ST-101)
    const rollMatches = query.match(ROLL_NUMBER_REGEX);
    if (rollMatches) {
      rollMatches.forEach(m => addCandidate(m));
    }

    // 2. Full Two-Word Names (e.g. "Rahul Sharma")
    let twoWordMatch;
    while ((twoWordMatch = TWO_WORD_NAME_REGEX.exec(query)) !== null) {
      if (twoWordMatch[1]) addCandidate(twoWordMatch[1]);
    }

    // 3. Contextual Names (e.g. "attendance of Rahul", "fee for Priya")
    let contextMatch;
    while ((contextMatch = CONTEXTUAL_NAME_REGEX.exec(query)) !== null) {
      if (contextMatch[1]) addCandidate(contextMatch[1]);
    }

    // 4. Token & Word Analysis (Stripping possessives 's / ’s)
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
   * Search students from Supabase public.students with deterministic hierarchical ranking
   */
  public static async searchStudents(cand: string): Promise<{
    status: 'SUCCESS' | 'NOT_FOUND' | 'CONNECTION_ERROR';
    matches: StudentEntity[];
    matchType?: 'EXACT_ID' | 'EXACT_FULL_NAME' | 'EXACT_FIRST_NAME' | 'EXACT_LAST_NAME' | 'PARTIAL';
  }> {
    const client = supabaseAdmin || supabase;
    if (!isSupabaseConfigured() || !client) {
      console.log('[Supabase Diagnostic] Service: studentService Status: ERROR Message: Client unavailable');
      return { status: 'CONNECTION_ERROR', matches: [] };
    }

    const trimmed = cand.trim();
    if (!trimmed) return { status: 'NOT_FOUND', matches: [] };

    try {
      // ----------------------------------------------------
      // HIERARCHY 1: Exact Student ID / Roll Number Match
      // ----------------------------------------------------
      const { data: idData, error: idErr } = await client
        .from('students')
        .select('id, student_id, first_name, last_name, email, department_id, class_id, is_active')
        .ilike('student_id', trimmed)
        .limit(5);

      if (idErr) {
        console.log(`[Supabase Diagnostic] Service: studentService Hierarchy: EXACT_ID Error: ${idErr.message}`);
        return { status: 'CONNECTION_ERROR', matches: [] };
      }

      if (idData && idData.length > 0) {
        const matches = this.mapStudentRows(idData);
        return { status: 'SUCCESS', matches, matchType: 'EXACT_ID' };
      }

      // ----------------------------------------------------
      // HIERARCHY 2: Exact Full Name Match (for multi-word candidates like "Rahul Sharma")
      // ----------------------------------------------------
      if (trimmed.includes(' ')) {
        const parts = trimmed.split(/\s+/);
        const first = parts[0];
        const last = parts.slice(1).join(' ');

        const { data: fullNameData, error: fullNameErr } = await client
          .from('students')
          .select('id, student_id, first_name, last_name, email, department_id, class_id, is_active')
          .ilike('first_name', first)
          .ilike('last_name', last)
          .limit(10);

        if (fullNameErr) {
          console.log(`[Supabase Diagnostic] Service: studentService Hierarchy: EXACT_FULL_NAME Error: ${fullNameErr.message}`);
          return { status: 'CONNECTION_ERROR', matches: [] };
        }

        if (fullNameData && fullNameData.length > 0) {
          const matches = this.mapStudentRows(fullNameData);
          return { status: 'SUCCESS', matches, matchType: 'EXACT_FULL_NAME' };
        }
      }

      // ----------------------------------------------------
      // HIERARCHY 3: Exact First Name Match
      // ----------------------------------------------------
      const { data: firstNameData, error: firstNameErr } = await client
        .from('students')
        .select('id, student_id, first_name, last_name, email, department_id, class_id, is_active')
        .ilike('first_name', trimmed)
        .limit(20);

      if (firstNameErr) {
        console.log(`[Supabase Diagnostic] Service: studentService Hierarchy: EXACT_FIRST_NAME Error: ${firstNameErr.message}`);
        return { status: 'CONNECTION_ERROR', matches: [] };
      }

      if (firstNameData && firstNameData.length > 0) {
        const matches = this.mapStudentRows(firstNameData);
        return { status: 'SUCCESS', matches, matchType: 'EXACT_FIRST_NAME' };
      }

      // ----------------------------------------------------
      // HIERARCHY 4: Exact Last Name Match
      // ----------------------------------------------------
      const { data: lastNameData, error: lastNameErr } = await client
        .from('students')
        .select('id, student_id, first_name, last_name, email, department_id, class_id, is_active')
        .ilike('last_name', trimmed)
        .limit(20);

      if (lastNameErr) {
        console.log(`[Supabase Diagnostic] Service: studentService Hierarchy: EXACT_LAST_NAME Error: ${lastNameErr.message}`);
        return { status: 'CONNECTION_ERROR', matches: [] };
      }

      if (lastNameData && lastNameData.length > 0) {
        const matches = this.mapStudentRows(lastNameData);
        return { status: 'SUCCESS', matches, matchType: 'EXACT_LAST_NAME' };
      }

      // ----------------------------------------------------
      // HIERARCHY 5: Partial / Fuzzy Name Match
      // ----------------------------------------------------
      const { data: partialData, error: partialErr } = await client
        .from('students')
        .select('id, student_id, first_name, last_name, email, department_id, class_id, is_active')
        .or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%,student_id.ilike.%${trimmed}%`)
        .limit(20);

      if (partialErr) {
        console.log(`[Supabase Diagnostic] Service: studentService Hierarchy: PARTIAL Error: ${partialErr.message}`);
        return { status: 'CONNECTION_ERROR', matches: [] };
      }

      if (partialData && partialData.length > 0) {
        const matches = this.mapStudentRows(partialData);
        return { status: 'SUCCESS', matches, matchType: 'PARTIAL' };
      }

      return { status: 'NOT_FOUND', matches: [] };
    } catch (err: any) {
      console.log(`[Supabase Diagnostic] Service: studentService Exception: ${err.message}`);
      return { status: 'CONNECTION_ERROR', matches: [] };
    }
  }

  private static mapStudentRows(rows: SupabaseStudentRow[]): StudentEntity[] {
    return rows.map(r => ({
      id: r.id,
      student_id: r.student_id,
      first_name: r.first_name || '',
      last_name: r.last_name || '',
      name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      department: r.departments?.name || r.departments?.code || (r.department_id ? `Dept ${r.department_id}` : undefined),
      class: r.classes?.name || (r.class_id ? `Class ${r.class_id}` : undefined),
      email: r.email,
    }));
  }
}
