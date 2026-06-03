import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to add the current domain to Firebase Authorized Domains.
 *
 * This uses the Firebase Management REST API with a service account key
 * (if configured via FIREBASE_SERVICE_ACCOUNT_KEY env var) to programmatically
 * add the requesting domain to the project's authorized domains list.
 *
 * If no service account key is configured, it returns instructions for
 * manual setup.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const domain = body.domain || request.headers.get("host") || "";

    if (!domain) {
      return NextResponse.json({ error: "No domain specified" }, { status: 400 });
    }

    // Clean domain (remove port if present)
    const cleanDomain = domain.split(":")[0];

    // Check if we have a service account key configured
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      // No service account - return manual instructions
      return NextResponse.json({
        success: false,
        domain: cleanDomain,
        message: "Service account key not configured. Add FIREBASE_SERVICE_ACCOUNT_KEY env var to enable automatic domain setup.",
        manualSteps: {
          firebase: {
            url: "https://console.firebase.google.com/project/ai-avatar-machine/authentication/settings",
            instructions: `Go to Authentication → Settings → Authorized domains → Add "${cleanDomain}"`,
          },
          googleCloud: {
            url: "https://console.cloud.google.com/apis/credentials/oauthclient/121083068310-6qjd3eqn8f9lq3aoqrfk5l8h2f5041qv.apps.googleusercontent.com?project=ai-avatar-machine",
            instructions: `Add "${cleanDomain}" to "Authorized JavaScript origins" and "https://${cleanDomain}/auth/google-callback" to "Authorized redirect URIs"`,
          },
        },
      });
    }

    // We have a service account - try to add the domain programmatically
    let serviceAccount: { client_email: string; private_key: string; project_id: string };
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch {
      return NextResponse.json({ error: "Invalid FIREBASE_SERVICE_ACCOUNT_KEY format" }, { status: 500 });
    }

    // Step 1: Get an OAuth2 access token using the service account
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = { alg: "RS256", typ: "JWT" };
    const jwtPayload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    // Import crypto for JWT signing
    const crypto = await import("crypto");

    const base64url = (str: string) => Buffer.from(str).toString("base64url");
    const headerB64 = base64url(JSON.stringify(jwtHeader));
    const payloadB64 = base64url(JSON.stringify(jwtPayload));
    const signInput = `${headerB64}.${payloadB64}`;

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signInput);
    const signature = sign.sign(serviceAccount.private_key, "base64url");

    const jwt = `${signInput}.${signature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.text();
      console.error("Failed to get OAuth2 token:", errData);
      return NextResponse.json({ error: "Failed to authenticate with Google" }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Get current project config
    const projectId = serviceAccount.project_id;
    const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

    const configResponse = await fetch(configUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!configResponse.ok) {
      const errData = await configResponse.text();
      console.error("Failed to get project config:", errData);
      return NextResponse.json({
        success: false,
        error: "Failed to get Firebase project config",
        details: errData,
        manualSteps: {
          firebase: {
            url: `https://console.firebase.google.com/project/${projectId}/authentication/settings`,
            instructions: `Go to Authentication → Settings → Authorized domains → Add "${cleanDomain}"`,
          },
        },
      }, { status: 500 });
    }

    const config = await configResponse.json();
    const currentDomains: string[] = config.authorizedDomains || [];

    // Check if domain is already authorized
    if (currentDomains.includes(cleanDomain)) {
      return NextResponse.json({
        success: true,
        message: `Domain "${cleanDomain}" is already in Firebase Authorized Domains`,
        authorizedDomains: currentDomains,
      });
    }

    // Step 3: Add the new domain
    const updatedDomains = [...currentDomains, cleanDomain];
    const updateResponse = await fetch(configUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ authorizedDomains: updatedDomains }),
    });

    if (!updateResponse.ok) {
      const errData = await updateResponse.text();
      console.error("Failed to update authorized domains:", errData);
      return NextResponse.json({
        success: false,
        error: "Failed to update Firebase authorized domains",
        details: errData,
        manualSteps: {
          firebase: {
            url: `https://console.firebase.google.com/project/${projectId}/authentication/settings`,
            instructions: `Go to Authentication → Settings → Authorized domains → Add "${cleanDomain}"`,
          },
        },
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Domain "${cleanDomain}" added to Firebase Authorized Domains`,
      authorizedDomains: updatedDomains,
    });
  } catch (error) {
    console.error("Setup domain error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check current auth config status
export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "unknown";
  const cleanDomain = host.split(":")[0];

  return NextResponse.json({
    domain: cleanDomain,
    hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    firebaseProject: "ai-avatar-machine",
    instructions: {
      step1: `Add "${cleanDomain}" to Firebase Authorized Domains: https://console.firebase.google.com/project/ai-avatar-machine/authentication/settings`,
      step2: `Add "${cleanDomain}" to Google Cloud OAuth Authorized JavaScript Origins: https://console.cloud.google.com/apis/credentials/oauthclient/121083068310-6qjd3eqn8f9lq3aoqrfk5l8h2f5041qv.apps.googleusercontent.com?project=ai-avatar-machine`,
      step3: `Add "https://${cleanDomain}/auth/google-callback" to Google Cloud OAuth Authorized Redirect URIs`,
    },
  });
}
