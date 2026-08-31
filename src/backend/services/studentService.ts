import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { STUDENTS_DATA, Student } from '../../lib/mockDatabase';

export class StudentService {
  /**
   * Fetch all active students from Supabase or in-memory fallback
   */
  public static async getAllStudents(): Promise<Student[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*');

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            rollNumber: d.roll_number || d.rollNumber,
            name: d.name || `${d.first_name || ''} ${d.last_name || ''}`.trim(),
            gender: d.gender || 'Not Specified',
            course: d.course || d.course_code,
            semester: d.semester || d.current_semester || 'Odd Sem',
            academicYear: d.academic_year || d.academicYear || '2025-26',
            email: d.email || '',
            phone: d.phone || ''
          }));
        }
      } catch (err) {
        console.warn('StudentService: Supabase query failed, using local master dataset:', err);
      }
    }

    return STUDENTS_DATA;
  }

  /**
   * Find student by name, roll number, or identifier
   */
  public static async findStudent(query: string): Promise<Student | null> {
    const clean = query.toLowerCase().trim();
    const all = await this.getAllStudents();

    // Exact or partial match on roll number
    const byRoll = all.find(s => clean.includes(s.rollNumber.toLowerCase()));
    if (byRoll) return byRoll;

    // Full name match
    const byName = all.find(s => clean.includes(s.name.toLowerCase()));
    if (byName) return byName;

    // First name match (e.g. Rahul, Priya, Aditya)
    const byFirstName = all.find(s => {
      const first = s.name.split(' ')[0].toLowerCase();
      const pattern = new RegExp(`\\b${first}('s|s)?\\b`, 'i');
      return pattern.test(clean);
    });

    return byFirstName || null;
  }
}
