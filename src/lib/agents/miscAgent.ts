import { COLLEGE_METRICS, COURSES_DATA } from '../mockDatabase';

export interface MiscAgentContext {
  rawQuery: string;
}

export interface MiscAgentResult {
  text: string;
  agent: 'MISC';
  quickActions?: { label: string; query: string }[];
}

export class MiscAgent {
  public static execute(ctx: MiscAgentContext): MiscAgentResult {
    const q = ctx.rawQuery.toLowerCase();

    // 1. Staff / Faculty Stats
    if (q.includes('staff') || q.includes('faculty') || q.includes('teacher') || q.includes('professor')) {
      return {
        text: `👨‍🏫 **Faculty & Staff Overview**\n\n` +
          `• **Total Staff:** ${COLLEGE_METRICS.totalStaff} Members\n` +
          `• **Departments Covered:** Engineering, Management, Commerce, Architecture\n` +
          `• **Active Groups:** Staff Grp 1 (15 Active Faculty)\n` +
          `• **College:** ${COLLEGE_METRICS.collegeName}\n\n` +
          `Would you like to review staff allocations or department workloads?`,
        agent: 'MISC',
        quickActions: [
          { label: 'View Fee Report', query: 'Show total fees collected odd sem' },
          { label: 'View Attendance', query: 'Class wise attendance percentage' },
        ]
      };
    }

    // 2. Student Demographics
    if (q.includes('student') || q.includes('boy') || q.includes('girl') || q.includes('gender') || q.includes('enrollment')) {
      return {
        text: `🎓 **Student Demographics [${COLLEGE_METRICS.collegeName}]**\n\n` +
          `• **Total Enrolled Students:** ${COLLEGE_METRICS.totalStudents}\n` +
          `• **Total Boys:** ${COLLEGE_METRICS.totalBoys} (47.9%)\n` +
          `• **Total Girls:** ${COLLEGE_METRICS.totalGirls} (61.6%)\n` +
          `• **Not Specified:** ${COLLEGE_METRICS.notSpecified}\n` +
          `• **Current Academic Term:** ${COLLEGE_METRICS.currentSem} Semester\n\n` +
          `You can request fee or attendance reports for any specific student or course.`,
        agent: 'MISC',
        quickActions: [
          { label: 'Odd Sem Fees in PDF', query: 'Download fee report in pdf' },
          { label: 'Attendance Sheet XLSX', query: 'Export attendance sheet as excel' },
        ]
      };
    }

    // 3. Courses & Programs
    if (q.includes('course') || q.includes('program') || q.includes('branch') || q.includes('department')) {
      let text = `📚 **Active Courses & Student Distribution**\n\n`;
      COURSES_DATA.forEach(c => {
        text += `• **${c.name}** (${c.code}): ${c.studentsCount} Students\n`;
      });
      text += `\n*Total Enrolled across all streams: ${COURSES_DATA.reduce((a, b) => a + b.studentsCount, 0)} student entries.*`;
      return {
        text,
        agent: 'MISC',
        quickActions: [
          { label: 'CSE Attendance', query: 'B.E. CSE attendance report' },
          { label: 'Architecture Fees', query: 'Architecture course fee status' }
        ]
      };
    }

    // 4. Placements & Career Services / Solar Partners
    if (q.includes('solar') || q.includes('power') || q.includes('roof') || q.includes('partner') || q.includes('benefit')) {
      return {
        text: `☀️ **Featured Partner: Power the Future, Today**\n\n` +
          `• **Program:** Solar Panels — turning rooftops into revenue.\n` +
          `• **Benefits:** Clean energy that pays for itself, crafted by institutional energy experts.\n` +
          `• **Milestones:** 50+ MW Installed, 500+ Projects, 7+ Years Experience across campuses.`,
        agent: 'MISC',
        quickActions: [
          { label: 'Gradit Placements', query: 'Tell me about Gradit Placements' },
          { label: 'Student Demographics', query: 'Total students in college' },
        ]
      };
    }

    if (q.includes('placement') || q.includes('job') || q.includes('recruit') || q.includes('resume') || q.includes('career')) {
      return {
        text: `💼 **Gradit Placements - AI-Driven Career Hub**\n\n` +
          `Exclusive institutional placement engine featuring:\n` +
          `• 🤖 **AI Resume Builder:** Automated ATS score optimization for students\n` +
          `• 📊 **Smart Data Analytics:** Skill-matrix to recruiter requirement matching\n` +
          `• 🏢 **HR Portals:** Direct pipeline with 120+ active tier-1 recruiters\n` +
          `• 📁 **Candidate Profiles:** Dynamic portfolios & verified academic transcripts\n\n` +
          `Top hiring partners this cycle: CloudTech Labs, InfraBuild Global, FinServ Dynamics.`,
        agent: 'MISC',
        quickActions: [
          { label: 'Check Exam Eligibility', query: 'Am I eligible for exams based on attendance?' },
          { label: 'My Pending Dues', query: 'What is my pending fee balance?' }
        ]
      };
    }

    // Default Greetings / Assistance
    return {
      text: `👋 **Welcome to GRADit! Intelligent Campus Assistant**\n\n` +
        `I am your deterministic multi-agent assistant for **${COLLEGE_METRICS.collegeName}**.\n\n` +
        `Here is what you can ask me:\n` +
        `• 💳 **Fee Inquiries:** "What is my pending fee?", "Total fees collected in odd sem", "Export fee receipt as pdf"\n` +
        `• 📋 **Attendance Inquiries:** "What is Rahul's attendance for 2025-26?", "Class-wise attendance report in excel", "Exam eligibility"\n` +
        `• 📊 **Campus Master Data:** "Total students", "Faculty stats", "Placement services"`,
      agent: 'MISC',
      quickActions: [
        { label: "Rahul's Attendance 2025-26", query: "What is Rahul's attendance for 2025-26?" },
        { label: 'My Pending Fees (PDF)', query: 'What is my pending fee in pdf?' },
        { label: 'Odd Sem Attendance (Excel)', query: 'Export odd sem attendance as excel' },
        { label: 'College Fees Aggregate', query: 'Total fees collected this semester' },
      ]
    };
  }
}
