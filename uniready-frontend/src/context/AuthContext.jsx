import { createContext, useContext, useState, useCallback } from "react";
import { API_BASE_URL } from "../lib/apiConfig";

// Real backend-wired auth. The session TOKEN is real — issued by
// uniready-api's /otp/verify endpoint — but where it's stored (localStorage)
// is a normal, expected pattern, same as most web apps. What changed from
// the earlier version of this file is that login/signup now genuinely go
// through the server: real OTP send, real hash comparison, real rate
// limiting — none of that is simulated anymore.
const SESSION_KEY = "uniready.auth.session"; // stores { token, user }

const AuthContext = createContext(null);

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Surface the backend's own error code/message rather than inventing
    // frontend copy — auth.go returns { error, message } consistently,
    // so callers can branch on `error` (e.g. "no_account") when needed.
    const err = new Error(data.message || "Something went wrong");
    err.code = data.error;
    err.retryAfter = data.retryAfter;
    throw err;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  // Sends an OTP to a new signup. Does not log anyone in — the account
  // isn't verified until verifyOtp() succeeds.
  const requestSignup = useCallback(({ name, phone, email, promoCode }) => {
    return apiPost("/api/v1/auth/signup", { name, phone, email, promoCode });
  }, []);

  // Sends an OTP for an existing account, using whichever identifier is
  // provided (phone or email — the backend resolves it the same way
  // Signup does). Throws with err.code === "no_account" if neither
  // identifier has a matching account — callers should show that
  // specific message rather than a generic failure.
  const requestLogin = useCallback(({ phone, email }) => {
    return apiPost("/api/v1/auth/login", { phone, email });
  }, []);

  // Verifies the code for either flow (signup or login — the backend
  // doesn't need to be told which, see auth.go). On success, stores the
  // real session token and user returned by the server.
  const verifyOtp = useCallback(({ phone, email, code }) => {
    return apiPost("/api/v1/auth/otp/verify", { phone, email, code }).then((data) => {
      const next = { token: data.token, user: data.user };
      setSession(next);
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      // Return both, not just user — a caller that needs to make an
      // authenticated request immediately after verifying (e.g. redeeming
      // a voucher entered at signup) can't rely on this context's own
      // state having re-rendered yet; the token from this resolved value
      // is guaranteed current.
      return { token: data.token, user: data.user };
    });
  }, []);

  const logout = useCallback(() => {
    // Note: this only clears the local copy of the session. There's no
    // backend endpoint yet to invalidate the session server-side (e.g.
    // DELETE /api/v1/auth/session) — worth adding before this matters for
    // real security (a "logged out" token would still technically work
    // against the API until it expires on its own).
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const value = {
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: Boolean(session?.token),
    requestSignup,
    requestLogin,
    verifyOtp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}