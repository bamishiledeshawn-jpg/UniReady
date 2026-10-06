import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminLogin() {
  const { isAuthenticated, login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full bg-surface-container-low border border-surface-container-highest text-on-surface rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-margin-mobile">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface rounded-xl card-shadow p-6 flex flex-col gap-stack-md"
      >
        <div>
          <h1 className="text-[24px] font-bold text-primary">UniReady</h1>
          <p className="text-[14px] text-text-secondary">Admin sign in</p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container text-[14px] rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1 text-[14px] font-medium text-on-surface">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-[14px] font-medium text-on-surface">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="bg-primary hover:bg-primary-hover text-on-primary font-semibold rounded-lg px-4 py-3 transition-colors disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
