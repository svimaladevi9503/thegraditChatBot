import { StudentService } from '../backend/services/studentService';

export interface ResolvedStudent {
  id: string;
  name: string;
  rollNumber: string;
  course: string;
  semester: string;
  academicYear: string;
  confidence: number;
}

export class StudentResolver {
  /**
   * Asynchronously resolves student entities from Supabase public.students
   * Examples:
   *  - "What is Rahul's attendance for 2025-26?" -> Resolves 'Rahul Sharma'
   *  - "What is Rahul's pending fee?" -> Resolves 'Rahul Sharma'
   *  - "Check 2025CSE019" -> Resolves 'Rahul Sharma'
   */
  public static async resolveAsync(query: string): Promise<ResolvedStudent | null> {
    if (!query) return null;
    const student = await StudentService.findStudent(query);
    if (!student) return null;
    return {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      course: student.course,
      semester: student.semester,
      academicYear: student.academicYear,
      confidence: 0.95,
    };
  }

  /**
   * Synchronous resolver fallback
   */
  public static resolve(query: string): ResolvedStudent | null {
    if (!query) return null;
    // Handled via async pipeline in OrchestratorAgent
    return null;
  }
}
