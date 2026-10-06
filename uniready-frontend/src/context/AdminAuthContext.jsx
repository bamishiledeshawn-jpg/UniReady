import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/apiConfig";

const STORAGE_KEY = "uniready_admin_session";

const AdminAuthContext = createContext(null);

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || "Login failed");
    const next = { token: data.token, admin: data.admin };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const adminFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${session?.token}`,
        },
      });
      if (res.status === 401) {
        logout();
        throw new Error("Session expired. Please log in again.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "Request failed");
      return data;
    },
    [session, logout]
  );

  const value = useMemo(
    () => ({
      admin: session?.admin ?? null,
      isAuthenticated: Boolean(session?.token),
      login,
      logout,
      adminFetch,
    }),
    [session, login, logout, adminFetch]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}