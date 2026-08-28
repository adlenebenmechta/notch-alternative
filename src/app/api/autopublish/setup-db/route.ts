import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/autopublish/setup-db
 * Manually triggers prisma db push to create the new tables
 */

const SETUP_SECRET = process.env.SETUP_SECRET || 'setup-kobisto-2026';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '') || '';
    
    if (providedSecret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Setup DB] Running prisma db push...');

    const prismaCommands = [
      'node ./node_modules/prisma/build/index.js db push --accept-data-loss',
      'npx --yes prisma db push --accept-data-loss',
      './node_modules/.bin/prisma db push --accept-data-loss',
    ];

    let lastError = null;
    let successOutput = null;

    for (const cmd of prismaCommands) {
      try {
        console.log(`[Setup DB] Trying: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: process.cwd(),
          timeout: 60000,
          env: process.env,
        });
        console.log(`[Setup DB] stdout:`, stdout);
        if (stderr) console.log(`[Setup DB] stderr:`, stderr);
        successOutput = stdout;
        break;
      } catch (err: any) {
        console.error(`[Setup DB] Failed: ${cmd}:`, err.message);
        lastError = err.message;
      }
    }

    if (successOutput) {
      return NextResponse.json({
        ok: true,
        message: 'Database tables created successfully',
        output: successOutput,
      });
    } else {
      return NextResponse.json({
        ok: false,
        error: 'All prisma commands failed',
        lastError,
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error('[Setup DB] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/autopublish/setup-db',
    method: 'POST',
    auth: 'Bearer <SETUP_SECRET>',
    note: 'Default SETUP_SECRET is "setup-kobisto-2026". Set SETUP_SECRET env var to customize.',
  });
}
