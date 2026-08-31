import { StudentService, StudentResolutionResult, QueryStatus } from '../backend/services/studentService';
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

export interface DetailedResolverOutput {
  status: QueryStatus;
  resolvedStudent: ResolvedStudent | null;
  multipleMatches?: Student[];
  totalMatchesCount?: number;
  candidateSearched?: string;
  isAmbiguous?: boolean;
  errorMessage?: string;
}

export class StudentResolver {
  /**
   * Detailed resolution supporting regex matching, Top 3 ambiguous suggestions, and show more
   */
  public static async resolveDetailed(query: string): Promise<DetailedResolverOutput> {
    if (!query) return { status: 'NOT_FOUND', resolvedStudent: null };
    const res: StudentResolutionResult = await StudentService.findStudentDetailed(query);
    
    if (res.status === 'CONNECTION_ERROR') {
      return {
        status: 'CONNECTION_ERROR',
        resolvedStudent: null,
        errorMessage: res.errorMessage || "⚠️ Unable to access student records right now. Please try again in a moment.",
      };
    }

    if (res.isAmbiguous && res.multipleMatches) {
      return {
        status: 'SUCCESS',
        resolvedStudent: null,
        multipleMatches: res.multipleMatches,
        totalMatchesCount: res.totalMatchesCount,
        candidateSearched: res.candidateSearched,
        isAmbiguous: true,
      };
    }

    if (!res.student || res.status === 'NOT_FOUND') {
      return { status: 'NOT_FOUND', resolvedStudent: null };
    }

    return {
      status: 'SUCCESS',
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
