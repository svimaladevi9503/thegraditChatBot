import { StudentService, StudentResolutionResult } from '../backend/services/studentService';
import { Student } from './mockDatabase';

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
   * Detailed resolution supporting multiple ambiguous matches
   */
  public static async resolveDetailed(query: string): Promise<{
    resolvedStudent: ResolvedStudent | null;
    multipleMatches?: Student[];
    isAmbiguous?: boolean;
  }> {
    if (!query) return { resolvedStudent: null };
    const res: StudentResolutionResult = await StudentService.findStudentDetailed(query);
    if (res.isAmbiguous && res.multipleMatches) {
      return {
        resolvedStudent: null,
        multipleMatches: res.multipleMatches,
        isAmbiguous: true,
      };
    }
    if (!res.student) return { resolvedStudent: null };
    return {
      resolvedStudent: {
        id: res.student.id,
        name: res.student.name,
        rollNumber: res.student.rollNumber,
        course: res.student.course,
        semester: res.student.semester,
        academicYear: res.student.academicYear,
        confidence: 0.95,
      },
    };
  }

  /**
   * Asynchronously resolves student entities from Supabase public.students
   */
  public static async resolveAsync(query: string): Promise<ResolvedStudent | null> {
    const res = await this.resolveDetailed(query);
    return res.resolvedStudent;
  }

  /**
   * Synchronous resolver fallback
   */
  public static resolve(query: string): ResolvedStudent | null {
    if (!query) return null;
    return null;
  }
}
