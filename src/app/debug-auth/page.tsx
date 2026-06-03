"use client";

import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";

export default function DebugAuthPage() {
  const { signInGoogle, signIn, user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const testGoogleSignIn = async () => {
    setLoading(true);
    setLogs([]);
    addLog(`Domain: ${window.location.hostname}`);
    addLog(`Origin: ${window.location.origin}`);
    addLog("--- Starting Google Sign-In (REST only) ---");

    try {
      addLog("Calling signInGoogle()...");
      const result = await signInGoogle();
      addLog(`Result: ${JSON.stringify(result)}`);
      if (result.error) {
        addLog(`❌ Error: ${result.error}`);
      } else {
        addLog("✅ Success!");
      }
    } catch (err) {
      addLog(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  const testEmailSignIn = async () => {
    setLoading(true);
    setLogs([]);
    addLog("Testing email sign-in with REST API...");
    try {
      const result = await signIn("test@test.com", "test123");
      addLog(`Result: ${JSON.stringify(result)}`);
      if (result.error) {
        addLog(`Error (expected for fake creds): ${result.error}`);
      } else {
        addLog("✅ Sign-in worked!");
      }
    } catch (err) {
      addLog(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  const testOAuth2Popup = async () => {
    setLoading(true);
    setLogs([]);
    addLog(`Domain: ${window.location.hostname}`);
    addLog("--- Testing direct OAuth2 popup ---");

    const GOOGLE_CLIENT_ID = "121083068310-6qjd3eqn8f9lq3aoqrfk5l8h2f5041qv.apps.googleusercontent.com";

    const redirectUri = `${window.location.origin}/auth/google-callback`;
    const nonce = Math.random().toString(36).slice(2);
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      nonce,
      prompt: "select_account",
    });

    addLog(`OAuth2 URL: https://accounts.google.com/o/oauth2/v2/auth?${params.toString().substring(0, 80)}...`);
    addLog(`Redirect URI: ${redirectUri}`);
    addLog("⚠️ IMPORTANT: This redirect URI must be added to Google Cloud Console → OAuth → Authorized redirect URIs");

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      "google_signin",
      "width=500,height=650,left=200,top=200"
    );

    if (!popup) {
      addLog("❌ Popup was blocked by browser!");
      setLoading(false);
      return;
    }

    addLog("Popup opened. Waiting for callback...");

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "google_oauth_callback") return;
      window.removeEventListener("message", handleMessage);
      clearInterval(pollInterval);

      if (event.data.idToken) {
        addLog("✅ Got Google ID token from popup!");
        addLog(`Token (first 50 chars): ${event.data.idToken.substring(0, 50)}...`);
      } else if (event.data.error) {
        addLog(`❌ OAuth error: ${event.data.error}`);
      } else {
        addLog("❌ No token received");
      }
      setLoading(false);
    };

    window.addEventListener("message", handleMessage);

    const pollInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollInterval);
        window.removeEventListener("message", handleMessage);
        addLog("Popup was closed by user");
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>🔍 Auth Debug (REST Only)</h1>

      {user && (
        <div style={{ padding: 12, background: "#0f0", borderRadius: 8, marginBottom: 16 }}>
          <strong>Current User:</strong> {user.email} ({user.role})
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={testGoogleSignIn} disabled={loading}
          style={{ padding: "8px 16px", background: "#4285f4", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Test Google Sign-In
        </button>
        <button onClick={testEmailSignIn} disabled={loading}
          style={{ padding: "8px 16px", background: "#34a853", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Test Email REST API
        </button>
        <button onClick={testOAuth2Popup} disabled={loading}
          style={{ padding: "8px 16px", background: "#ea4335", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Test OAuth2 Popup Direct
        </button>
      </div>

      <div style={{ background: "#1a1a2e", color: "#0f0", padding: 16, borderRadius: 8, minHeight: 200, maxHeight: 400, overflowY: "auto", fontSize: 13, lineHeight: 1.6 }}>
        {logs.length === 0 ? (
          <span style={{ color: "#666" }}>Click a button above to start...</span>
        ) : logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: "#f0f0f0", borderRadius: 8, fontSize: 13 }}>
        <strong>Info:</strong>
        <div>Domain: {typeof window !== "undefined" ? window.location.hostname : "N/A"}</div>
        <div>Origin: {typeof window !== "undefined" ? window.location.origin : "N/A"}</div>
        <div>Auth mode: REST API only (no Firebase SDK)</div>
      </div>
    </div>
  );
}
