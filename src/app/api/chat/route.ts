import { NextRequest, NextResponse } from 'next/server';
import { OrchestratorAgent } from '@/lib/chatEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, userId, userRole } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing query string' },
        { status: 400 }
      );
    }

    const response = await OrchestratorAgent.processQuery(query, userId || 'st-00', userRole || 'ADMIN');
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('API /api/chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing chat request', text: 'Error executing request' },
      { status: 500 }
    );
  }
}
