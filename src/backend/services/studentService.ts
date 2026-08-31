import { supabase, supabaseAdmin, isSupabaseConfigured } from '../supabaseClient';
import { STUDENTS_DATA, Student } from '../../lib/mockDatabase';

export interface SupabaseStudentRow {
  id: string;
  student_id: string; // Roll / Registration Number
  first_name: string;
  last_name: string;
  email?: string;
  department_id?: string;
  class_id?: string;
  admission_year?: number | string;
  is_active?: boolean;
  created_at?: string;
}

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'for', 'of', 'and', 'to', 'in', 'a', 'an', 'show', 'tell',
  'check', 'get', 'give', 'me', 'details', 'status', 'record', 'records', 'report',
  'attendance', 'fee', 'fees', 'pending', 'due', 'paid', 'total', 'my', 'student',
  'pdf', 'excel', 'xlsx', 'docx', 'doc', 'download', 'export', 'current', 'sem',
  'semester', 'year', '2024', '2025', '2026', '2027', '2025-26', '2024-25', 'odd', 'even', 'how', 'much'
]);

export class StudentService {
  /**
   * Extract potential student name candidates from natural language query
   */
  private static extractCandidates(query: string): string[] {
    const clean = query
      .replace(/['’]s\b/gi, '') // remove possessive 's
      .replace(/[<>"`\\]/g, ' ') // remove special chars
      .replace(/[^\w\s-]/gi, ' ')
      .trim();

    const words = clean.split(/\s+/).filter(w => w.length >= 2);
    const candidates: string[] = [];

    // 1. Non-stopword alphanumeric words (names like Rahul, Priya, Aditya, Sharma)
    for (const w of words) {
      const lower = w.toLowerCase();
      // Skip pure year numbers (e.g. 2025, 2026, 25, 26)
      if (/^\d{2,4}$/.test(w)) continue;
      if (!STOP_WORDS.has(lower)) {
        candidates.push(w);
        // If word ends with 's' (e.g. Rahuls), also add base name (e.g. Rahul)
        if (w.length > 3 && (w.endsWith('s') || w.endsWith('S'))) {
          candidates.push(w.slice(0, -1));
        }
      }
    }

    // 2. Add full roll numbers (must have letters and digits or start with ST-)
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
  public static async getAllStudents(): Promise<Student[]> {
    const client = supabaseAdmin || supabase;
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('students')
          .select('id, student_id, first_name, last_name, email, department_id, class_id, admission_year, is_active, created_at')
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          return data.map((d: SupabaseStudentRow) => ({
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
        }
      } catch (err) {
        console.warn('StudentService: Supabase query failed, falling back:', err);
      }
    }

    return STUDENTS_DATA;
  }

  /**
   * Find student by first name, full name, or roll number (student_id)
   */
  public static async findStudent(query: string): Promise<Student | null> {
    if (!query) return null;
    const candidates = this.extractCandidates(query);
    const client = supabaseAdmin || supabase;

    // 1. Query Live Supabase public.students table
    if (isSupabaseConfigured() && client && candidates.length > 0) {
      try {
        for (const cand of candidates) {
          const { data, error } = await client
            .from('students')
            .select('id, student_id, first_name, last_name, email, department_id, class_id, admission_year, is_active')
            .or(`student_id.ilike.%${cand}%,first_name.ilike.%${cand}%,last_name.ilike.%${cand}%`)
            .limit(1);

          if (!error && data && data.length > 0) {
            const d = data[0];
            return {
              id: d.id,
              rollNumber: d.student_id,
              name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
              gender: 'Not Specified',
              course: d.class_id ? `Class ${d.class_id}` : 'B.E. CSE',
              semester: 'Odd Sem',
              academicYear: d.admission_year ? `${d.admission_year}-${Number(d.admission_year) + 1}` : '2025-26',
              email: d.email || '',
              phone: '',
            };
          }
        }
      } catch (err) {
        console.warn('StudentService.findStudent: Supabase error, using fallback:', err);
      }
    }

    // 2. In-Memory Fallback Matcher
    const clean = query.toLowerCase();
    const all = STUDENTS_DATA;

    // Match by candidate tokens or direct roll/name
    for (const cand of (candidates.length > 0 ? candidates : [query])) {
      const cLower = cand.toLowerCase();
      const match = all.find(s => 
        s.rollNumber.toLowerCase().includes(cLower) ||
        s.name.toLowerCase().includes(cLower) ||
        s.name.split(' ')[0].toLowerCase() === cLower
      );
      if (match) return match;
    }

    const byName = all.find(s => clean.includes(s.name.toLowerCase()));
    if (byName) return byName;

    return null;
  }
}
