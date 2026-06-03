import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { getAuthUser } from "@/lib/auth-server";

// VIP emails matching the client-side list
const VIP_EMAILS = new Set([
  "adlenbenmechta3@gmail.com",
  "hello@fullynutrition.com",
  "novaamz@gmail.com",
  "mecifmouhaned@gmail.com",
  "workdr2026@gmail.com",
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
    const email = decodedToken.email || "";
    const name = decodedToken.name || email.split("@")[0] || "User";
    const picture = decodedToken.picture || "";

    // Check if user exists in our database
    let dbUser = null;
    try {
      dbUser = await getAuthUser(uid);
    } catch (e) {
      console.warn("Failed to check user in database:", e);
    }

    const isVip = VIP_EMAILS.has(email.toLowerCase().trim());

    // Build user object
    const user = {
      id: uid,
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
