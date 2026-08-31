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

export class StudentService {
  /**
   * Fetch all active students from live public.students table (with fallback)
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
            course: d.class_id ? `Class ${d.class_id}` : 'Engineering & Technology',
            semester: 'Odd Sem',
            academicYear: d.admission_year ? `${d.admission_year}-${Number(d.admission_year) + 1}` : '2025-26',
            email: d.email || '',
            phone: '',
          }));
        }
      } catch (err) {
        console.warn('StudentService: Supabase query failed, using in-memory dataset:', err);
      }
    }

    // Seamless Fallback
    return STUDENTS_DATA;
  }

  /**
   * Find student by first name, full name, or roll number (student_id)
   */
  public static async findStudent(query: string): Promise<Student | null> {
    const clean = query.toLowerCase().trim();
    const client = supabaseAdmin || supabase;

    // 1. Try Live Supabase Query
    if (isSupabaseConfigured() && client) {
      try {
        // Match exact student_id or ilike first_name
        const { data, error } = await client
          .from('students')
          .select('id, student_id, first_name, last_name, email, department_id, class_id, admission_year, is_active')
          .or(`student_id.ilike.%${clean}%,first_name.ilike.%${clean}%,last_name.ilike.%${clean}%`)
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
      } catch (err) {
        console.warn('StudentService.findStudent: Supabase lookup error, falling back:', err);
      }
    }

    // 2. In-Memory Fallback Matcher
    const all = STUDENTS_DATA;

    // Roll number match
    const byRoll = all.find(s => clean.includes(s.rollNumber.toLowerCase()));
    if (byRoll) return byRoll;

    // Full name match
    const byName = all.find(s => clean.includes(s.name.toLowerCase()));
    if (byName) return byName;

    // First name match (e.g. "Rahul", "Priya", "Aditya")
    const byFirstName = all.find(s => {
      const first = s.name.split(' ')[0].toLowerCase();
      const pattern = new RegExp(`\\b${first}('s|s)?\\b`, 'i');
      return pattern.test(clean);
    });

    return byFirstName || null;
  }
}
