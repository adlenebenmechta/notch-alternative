import { NextRequest, NextResponse } from 'next/server';
import { createRule, getRules, deleteRule } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');
    const planId = searchParams.get('planId') || undefined;
    const rules = await getRules({
      isActive: isActive === null ? undefined : isActive === 'true',
      planId,
    });
    return NextResponse.json({ rules });
  } catch (err: any) {
    console.error('[API /schedule/rules GET] Error:', err);
    return NextResponse.json({ error: err.message, rules: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rule = await createRule(body);
    return NextResponse.json({ rule });
  } catch (err: any) {
    console.error('[API /schedule/rules POST] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get('id');
    if (!ruleId) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const ok = await deleteRule(ruleId);
    return NextResponse.json({ ok });
  } catch (err: any) {
    console.error('[API /schedule/rules DELETE] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
