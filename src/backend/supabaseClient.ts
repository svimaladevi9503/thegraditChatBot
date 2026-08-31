import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Public Supabase Client (For Client-side & Anon RLS queries)
 */
export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Privileged Service-Role Supabase Client (Server-side ONLY)
 */
export const supabaseAdmin: SupabaseClient | null = 
  supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }) 
    : supabase;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceKey));
};

export interface HealthCheckResult {
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  url: string;
  latencyMs: number;
  tablesVerified: {
    students: boolean;
    attendance: boolean;
    fees: boolean;
    student_attendance_summary: boolean;
    student_fee_summary: boolean;
  };
  details?: string;
}

/**
 * Supabase Connection Health Check
 */
export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  const client = supabaseAdmin || supabase;
  if (!client || !isSupabaseConfigured()) {
    return {
      status: 'DISCONNECTED',
      url: supabaseUrl || 'NOT_CONFIGURED',
      latencyMs: 0,
      tablesVerified: {
        students: false,
        attendance: false,
        fees: false,
        student_attendance_summary: false,
        student_fee_summary: false,
      },
      details: 'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY / PUBLISHABLE_KEY is missing.',
    };
  }

  const startTime = Date.now();
  try {
    const [
      { error: sErr },
      { error: aErr },
      { error: fErr },
      { error: attSumErr },
      { error: feeSumErr }
    ] = await Promise.all([
      client.from('students').select('id').limit(1),
      client.from('attendance').select('id').limit(1),
      client.from('fees').select('id').limit(1),
      client.from('student_attendance_summary').select('student_id').limit(1),
      client.from('student_fee_summary').select('student_id').limit(1)
    ]);

    const latencyMs = Date.now() - startTime;

    return {
      status: 'CONNECTED',
      url: supabaseUrl,
      latencyMs,
      tablesVerified: {
        students: !sErr,
        attendance: !aErr,
        fees: !fErr,
        student_attendance_summary: !attSumErr,
        student_fee_summary: !feeSumErr,
      },
      details: 'Connection verified against live Supabase instance and views.',
    };
  } catch (err: any) {
    return {
      status: 'ERROR',
      url: supabaseUrl,
      latencyMs: Date.now() - startTime,
      tablesVerified: {
        students: false,
        attendance: false,
        fees: false,
        student_attendance_summary: false,
        student_fee_summary: false,
      },
      details: err.message || 'Connection failed',
    };
  }
}
