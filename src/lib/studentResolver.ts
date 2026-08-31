import { STUDENTS_DATA, Student } from './mockDatabase';
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
  public static async resolveAsync(query: string): Promise<ResolvedStudent | null> {
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
   * Identifies and resolves student entities from faculty or admin queries
   * Examples:
   *  - "What is Rahul's attendance for 2025-26?" -> Resolves 'Rahul Sharma'
   *  - "Priya's fee details" -> Resolves 'Priya Narayanan'
   *  - "Check 2025CSE019" -> Resolves 'Rahul Sharma'
   */
  public static resolve(query: string): ResolvedStudent | null {
    if (!query) return null;
    const cleanQuery = query.toLowerCase();

    // 1. Direct Roll Number check
    for (const student of STUDENTS_DATA) {
      if (cleanQuery.includes(student.rollNumber.toLowerCase())) {
        return {
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber,
          course: student.course,
          semester: student.semester,
          academicYear: student.academicYear,
          confidence: 1.0,
        };
      }
    }

    // 2. Full Name check
    for (const student of STUDENTS_DATA) {
      if (cleanQuery.includes(student.name.toLowerCase())) {
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
    }

    // 3. First Name / Possessive Name check (e.g., "Rahul's", "Rahul", "Aditya", "Priya")
    for (const student of STUDENTS_DATA) {
      const firstName = student.name.split(' ')[0].toLowerCase();
      const possessivePattern = new RegExp(`\\b${firstName}('s|s)?\\b`, 'i');
      if (possessivePattern.test(cleanQuery)) {
        return {
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber,
          course: student.course,
          semester: student.semester,
          academicYear: student.academicYear,
          confidence: 0.90,
        };
      }
    }

    return null;
  }
}
