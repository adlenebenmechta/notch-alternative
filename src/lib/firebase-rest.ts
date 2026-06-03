// Firebase REST API utilities — NO Firebase SDK imports
// This file uses only fetch() to call Firebase REST APIs directly.
// This avoids all firebase/auth minification issues in Next.js.

const FIREBASE_API_KEY = "AIzaSyAmC4nz1cpnmo-7OVw1E9HaqCf69LsJPBU";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RestAuthResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
}

async function handleRestError(response: Response): Promise<never> {
  const data = await response.json().catch(() => ({}));
  const error = data.error || {};
  const msg = error.message || "Unknown error";
  throw { code: msg, message: msg };
}

// ─── Email/Password Auth (REST API) ────────────────────────────────────────

export async function signUpWithEmailRest(email: string, password: string): Promise<RestAuthResponse> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) await handleRestError(res);
  return res.json();
}

export async function signInWithEmailRest(email: string, password: string): Promise<RestAuthResponse> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) await handleRestError(res);
  return res.json();
}

// ─── Google Sign-In via REST API (bypasses domain check) ──────────────────

export async function signInWithGoogleRest(googleIdToken: string): Promise<RestAuthResponse> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `id_token=${googleIdToken}&providerId=google.com`,
        requestUri: "https://ai-avatar-machine.firebaseapp.com",
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    }
  );
  if (!res.ok) await handleRestError(res);
  return res.json();
}

// ─── Profile Update (REST API) ─────────────────────────────────────────────

export async function updateProfileRest(idToken: string, displayName: string): Promise<void> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, displayName, returnSecureToken: true }),
    }
  );
  if (!res.ok) await handleRestError(res);
}

// ─── Token Refresh (REST API) ──────────────────────────────────────────────

export async function refreshIdToken(refreshToken: string): Promise<RestAuthResponse> {
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw { code: data.error || "token_refresh_failed", message: data.error_description || data.error || "Token refresh failed" };
  }
  const data = await res.json();
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    localId: data.user_id,
    email: data.email,
    displayName: data.display_name,
    photoUrl: data.photo_url,
  };
}

// ─── Session Persistence ───────────────────────────────────────────────────

const AUTH_STORAGE_KEY = "firebase_auth_session";

export interface StoredAuthSession {
  idToken: string;
  refreshToken: string;
  localId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  expiresAt: number;
}

export function saveAuthSession(data: RestAuthResponse): StoredAuthSession {
  const session: StoredAuthSession = {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
    email: data.email || "",
    displayName: data.displayName || "",
    photoUrl: data.photoUrl || "",
    expiresAt: Date.now() + (parseInt(data.expiresIn) || 3600) * 1000,
  };
  try { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session)); } catch {}
  return session;
}

export function loadAuthSession(): StoredAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredAuthSession;
    return session;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
}
