import { NextRequest, NextResponse } from 'next/server';
import { createPlan, getPlans } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const plans = await getPlans();
    return NextResponse.json({ plans });
  } catch (err: any) {
    console.error('[API /schedule/plans GET] Error:', err);
    return NextResponse.json({ error: err.message, plans: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plan = await createPlan(body);
    return NextResponse.json({ plan });
  } catch (err: any) {
    console.error('[API /schedule/plans POST] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
