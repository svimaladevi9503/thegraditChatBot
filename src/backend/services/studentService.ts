import { supabase, supabaseAdmin, isSupabaseConfigured } from '../supabaseClient';
import { STUDENTS_DATA, Student } from '../../lib/mockDatabase';

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
  isAmbiguous?: boolean;
  errorMessage?: string;
}

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'for', 'of', 'and', 'to', 'in', 'a', 'an', 'show', 'tell',
  'check', 'get', 'give', 'me', 'details', 'status', 'record', 'records', 'report',
  'attendance', 'fee', 'fees', 'pending', 'due', 'paid', 'total', 'my', 'student',
  'pdf', 'excel', 'xlsx', 'docx', 'doc', 'download', 'export', 'current', 'sem',
  'semester', 'year', '2024', '2025', '2026', '2027', '2025-26', '2024-25', 'odd', 'even', 'how', 'much',
  'overall', 'collection', 'summary', 'all', 'college', 'class', 'wise', 'list'
]);

const useDemoData = process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true';

export class StudentService {
  /**
   * Extract potential student name candidates from natural language query
   */
  public static extractCandidates(query: string): string[] {
    const clean = query
      .replace(/['’]s\b/gi, '')
      .replace(/[<>"`\\]/g, ' ')
      .replace(/[^\w\s-]/gi, ' ')
      .trim();

    const words = clean.split(/\s+/).filter(w => w.length >= 2);
    const candidates: string[] = [];

    // 1. Non-stopword alphanumeric words (names like Rahul, Priya, Aditya, Sharma)
    for (const w of words) {
      const lower = w.toLowerCase();
      if (/^\d{2,4}$/.test(w)) continue;
      if (!STOP_WORDS.has(lower)) {
        candidates.push(w);
        if (w.length > 3 && (w.endsWith('s') || w.endsWith('S'))) {
          candidates.push(w.slice(0, -1));
        }
      }
    }

    // 2. Add full roll numbers
    for (const w of words) {
      if ((/\d/.test(w) && /[a-zA-Z]/.test(w)) || w.toUpperCase().startsWith('ST-')) {
        candidates.unshift(w);
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
      if (useDemoData) return { status: 'SUCCESS', data: STUDENTS_DATA };
      return { status: 'CONNECTION_ERROR', data: [] };
    }

    try {
      const { data, error } = await client
        .from('students')
        .select('id, student_id, first_name, last_name, email, department_id, class_id, admission_year, is_active, created_at')
        .eq('is_active', true);

      if (error) {
        if (useDemoData) return { status: 'SUCCESS', data: STUDENTS_DATA };
        return { status: 'CONNECTION_ERROR', data: [] };
      }

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

      // 0 rows returned
      if (useDemoData) return { status: 'SUCCESS', data: STUDENTS_DATA };
      return { status: 'NOT_FOUND', data: [] };
    } catch (err) {
      if (useDemoData) return { status: 'SUCCESS', data: STUDENTS_DATA };
      return { status: 'CONNECTION_ERROR', data: [] };
    }
  }

  /**
   * Find student with strict 3-tier status (SUCCESS | NOT_FOUND | CONNECTION_ERROR)
   */
  public static async findStudentDetailed(query: string): Promise<StudentResolutionResult> {
    if (!query) return { status: 'NOT_FOUND', student: null };
    const candidates = this.extractCandidates(query);
    const client = supabaseAdmin || supabase;

    if (!isSupabaseConfigured() || !client) {
      if (useDemoData) {
        return this.findStudentDemo(query, candidates);
      }
      return { status: 'CONNECTION_ERROR', student: null, errorMessage: "I'm unable to access student records right now. Please try again." };
    }

    if (candidates.length === 0) {
      return { status: 'NOT_FOUND', student: null };
    }

    try {
      for (const cand of candidates) {
        const { data, error } = await client
          .from('students')
          .select('id, student_id, first_name, last_name, email, department_id, class_id, admission_year, is_active')
          .or(`student_id.ilike.%${cand}%,first_name.ilike.%${cand}%,last_name.ilike.%${cand}%`)
          .limit(5);

        if (error) {
          if (useDemoData) return this.findStudentDemo(query, candidates);
          return { status: 'CONNECTION_ERROR', student: null, errorMessage: "I'm unable to access student records right now. Please try again." };
        }

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
              isAmbiguous: true,
            };
          }

          return { status: 'SUCCESS', student: mapped[0] };
        }
      }

      // No match found in live database
      if (useDemoData) {
        return this.findStudentDemo(query, candidates);
      }

      return { status: 'NOT_FOUND', student: null };
    } catch (err) {
      if (useDemoData) {
        return this.findStudentDemo(query, candidates);
      }
      return { status: 'CONNECTION_ERROR', student: null, errorMessage: "I'm unable to access student records right now. Please try again." };
    }
  }

  /**
   * Find single student
   */
  public static async findStudent(query: string): Promise<Student | null> {
    const result = await this.findStudentDetailed(query);
    return result.student;
  }

  private static findStudentDemo(query: string, candidates: string[]): StudentResolutionResult {
    const clean = query.toLowerCase();
    const all = STUDENTS_DATA;

    for (const cand of (candidates.length > 0 ? candidates : [query])) {
      const cLower = cand.toLowerCase();
      const matches = all.filter(s => 
        s.rollNumber.toLowerCase().includes(cLower) ||
        s.name.toLowerCase().includes(cLower) ||
        s.name.split(' ')[0].toLowerCase() === cLower
      );
      if (matches.length === 1) return { status: 'SUCCESS', student: matches[0] };
      if (matches.length > 1) return { status: 'SUCCESS', student: null, multipleMatches: matches, isAmbiguous: true };
    }

    const byName = all.filter(s => clean.includes(s.name.toLowerCase()));
    if (byName.length === 1) return { status: 'SUCCESS', student: byName[0] };
    if (byName.length > 1) return { status: 'SUCCESS', student: null, multipleMatches: byName, isAmbiguous: true };

    return { status: 'NOT_FOUND', student: null };
  }
}
