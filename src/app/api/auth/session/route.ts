import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { db } from "@/lib/db";

// VIP emails matching the client-side list
const VIP_EMAILS = new Set([
  "adlenbenmechta3@gmail.com",
  "hello@fullynutrition.com",
  "novaamz@gmail.com",
  "mecifmouhaned@gmail.com",
  "workdr2026@gmail.com",
  "aasslesh.k@gmail.com",
  "sivakuria@gmail.com",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the Firebase ID token
    let decodedToken: { uid?: string; sub?: string; email?: string; name?: string; picture?: string } | null = null;
    try {
      decodedToken = await verifyIdToken(idToken) as typeof decodedToken;
    } catch (verifyErr) {
      console.error("Token verification failed:", verifyErr);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decodedToken?.uid || decodedToken?.sub || "";
    const email = (decodedToken?.email || "").toLowerCase().trim();
    const name = decodedToken?.name || email.split("@")[0] || "User";
    const picture = decodedToken?.picture || "";

    if (!email) {
      return NextResponse.json(
        { error: "No email in token" },
        { status: 400 }
      );
    }

    const isVip = VIP_EMAILS.has(email);

    // Try to look up user in database (non-blocking — don't fail if DB is down)
    let dbUser: {
      id: string;
      name: string;
      email: string;
      role: string;
      plan: string;
      creditsUsed: number;
      creditsLimit: number;
    } | null = null;
    try {
      dbUser = await db.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          creditsUsed: true,
          creditsLimit: true,
        },
      });
    } catch (e) {
      console.warn("DB lookup failed (non-critical):", e);
    }

    // For VIP users, ensure DB is in sync
    if (isVip && dbUser) {
      try {
        await db.user.update({
          where: { email },
          data: {
            role: "admin",
            plan: "enterprise",
            creditsLimit: 999999,
            updatedAt: new Date(),
          },
        });
      } catch {
        // Non-critical
      }
    }

    // Auto-create user in DB if not found (first sign-in)
    if (!dbUser && email) {
      try {
        dbUser = await db.user.create({
          data: {
            name,
            email,
            password: "",
            role: isVip ? "admin" : "user",
            plan: isVip ? "enterprise" : "free",
            creditsUsed: 0,
            creditsLimit: isVip ? 999999 : 3,
            subscription: {
              create: { plan: isVip ? "enterprise" : "free", status: "active" },
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            plan: true,
            creditsUsed: true,
            creditsLimit: true,
          },
        });
      } catch (createErr) {
        console.warn("Auto-create user failed (non-critical):", createErr);
      }
    }

    // Build user object — always succeeds even if DB is completely down
    const user = {
      id: dbUser?.id || uid,
      name: dbUser?.name || name,
      email,
      role: isVip ? "admin" : (dbUser?.role || "user"),
      plan: isVip ? "enterprise" : (dbUser?.plan || "free"),
      creditsUsed: dbUser?.creditsUsed || 0,
      creditsLimit: isVip ? 999999 : (dbUser?.creditsLimit || 3),
      picture,
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Session API unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
