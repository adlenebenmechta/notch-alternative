import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const ContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  website: z.string().trim().max(300).optional().or(z.literal("")),
  projectType: z.string().trim().min(2).max(120),
  budgetRange: z.string().trim().max(80).optional().or(z.literal("")),
  details: z.string().trim().min(10).max(5000),
  nickname: z.string().optional(), // honeypot
});

/** Basic in-memory rate limit: 5 submissions / 10 minutes / IP. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_LIMIT) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // safety valve
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    // honeypot: silently accept but never store
    if (typeof body.nickname === "string" && body.nickname.trim() !== "") {
      return NextResponse.json({ ok: true });
    }

    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please fill in the required fields with valid information." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    await db.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        company: data.company || null,
        website: data.website || null,
        projectType: data.projectType,
        budgetRange: data.budgetRange || null,
        details: data.details,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact] failed:", error);
    return NextResponse.json(
      { error: "We couldn't send your message. Please email us directly." },
      { status: 500 }
    );
  }
}
