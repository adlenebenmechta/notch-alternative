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
    const decodedToken = await verifyIdToken(idToken);
    const uid = decodedToken.uid || decodedToken.sub;
    const email = (decodedToken.email || "").toLowerCase().trim();
    const name = decodedToken.name || email.split("@")[0] || "User";
    const picture = decodedToken.picture || "";

    // Look up user in database by email
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
      console.warn("Failed to look up user in database:", e);
    }

    const isVip = VIP_EMAILS.has(email);

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

    // Auto-create user in DB if not found (first Google sign-in)
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
        console.warn("Failed to auto-create user in DB:", createErr);
      }
    }

    // Build user object
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
    console.error("Session API error:", error);
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
