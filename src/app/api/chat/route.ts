import { NextRequest, NextResponse } from 'next/server';
import { OrchestratorAgent } from '@/lib/chatEngine';

export async function POST(req: NextRequest) {
  const traceId = `CHAT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  try {
    const body = await req.json();
    const { query, userId } = body;

    console.log(`\n====================================`);
    console.log(`[TRACE ${traceId}] CHAT REQUEST RECEIVED`);
    console.log(`Runtime instance: PHASE_3_3`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Project root: ${process.cwd()}`);
    console.log(`Query: "${query}"`);
    console.log(`====================================`);

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing query string' },
        { status: 400 }
      );
    }

    const response = await OrchestratorAgent.processQuery(query, userId || 'st-00');
    console.log(`[TRACE ${traceId}] Response Status: ${response.success ? 'SUCCESS' : 'ERROR/NOT_FOUND'} Agent: ${response.agent}`);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error(`[TRACE ${traceId}] API /api/chat error:`, error);
    return NextResponse.json(
      { error: 'Internal server error processing chat query' },
      { status: 500 }
    );
  }
}
