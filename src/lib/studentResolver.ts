import { StudentService, StudentEntity } from '../backend/services/studentService';

export interface StudentMatchItem {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  department?: string;
  class?: string;
}

export interface ResolvedStudent {
  id: string;
  name: string;
  rollNumber: string;
  course?: string;
  semester?: string;
  academicYear?: string;
  confidence?: number;
}

export interface StudentResolutionContract {
  status: 'RESOLVED' | 'AMBIGUOUS' | 'NOT_FOUND' | 'CONNECTION_ERROR';
  searchTerm: string;
  student?: {
    id: string;
    student_id: string;
    first_name: string;
    last_name: string;
    department?: string;
    class?: string;
  };
  matches?: StudentMatchItem[];
  totalMatches?: number;
  remainingMatches?: number;
  errorMessage?: string;
}

export class StudentResolver {
  /**
   * Evaluates student resolution with deterministic hierarchy and ambiguity safety
   */
  public static async resolve(query: string): Promise<StudentResolutionContract> {
    if (!query || typeof query !== 'string') {
      return { status: 'NOT_FOUND', searchTerm: '' };
    }

    // Step 1: Candidate Extraction (Regex / Tokens only extract candidates, never decides student)
    const candidates = StudentService.extractCandidates(query);

    if (candidates.length === 0) {
      return { status: 'NOT_FOUND', searchTerm: '' };
    }

    // Step 2: Database Search across Candidates using Deterministic Hierarchy
    for (const cand of candidates) {
      const searchResult = await StudentService.searchStudents(cand);

      if (searchResult.status === 'CONNECTION_ERROR') {
        return {
          status: 'CONNECTION_ERROR',
          searchTerm: cand,
          errorMessage: '⚠️ Unable to access student records right now. Please try again in a moment.',
        };
      }

      if (searchResult.status === 'SUCCESS' && searchResult.matches.length > 0) {
        const matches = searchResult.matches;

        // Exactly ONE student matches uniquely
        if (matches.length === 1) {
          const s = matches[0];
          return {
            status: 'RESOLVED',
            searchTerm: cand,
            student: {
              id: s.id,
              student_id: s.student_id,
              first_name: s.first_name,
              last_name: s.last_name,
              department: s.department,
              class: s.class,
            },
            totalMatches: 1,
            remainingMatches: 0,
          };
        }

        // Multiple students match -> NEVER select automatically, return AMBIGUOUS
        const mappedMatches: StudentMatchItem[] = matches.map(m => ({
          id: m.id,
          student_id: m.student_id,
          first_name: m.first_name,
          last_name: m.last_name,
          department: m.department,
          class: m.class,
        }));

        return {
          status: 'AMBIGUOUS',
          searchTerm: cand,
          matches: mappedMatches,
          totalMatches: mappedMatches.length,
          remainingMatches: Math.max(0, mappedMatches.length - 3),
        };
      }
    }

    // No candidates matched any student record
    return {
      status: 'NOT_FOUND',
      searchTerm: candidates[0] || query,
    };
  }
}
