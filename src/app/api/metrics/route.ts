import { NextResponse } from 'next/server';
import { MetricsService } from '@/backend/services/metricsService';

export async function GET() {
  try {
    const metrics = await MetricsService.getMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API /api/metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
