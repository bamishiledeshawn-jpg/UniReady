import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiConfig";

function isValidNigerianPhone(value) {
  const digits = value.replace(/\D/g, "");
  return /^0\d{10}$/.test(digits) || /^234\d{10}$/.test(digits);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AuthEntry() {
  const navigate = useNavigate();
  const { requestSignup, requestLogin } = useAuth();

  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // One field covers both voucher codes and promo codes — the backend
  // tries it as a promo code at signup, and (after verification) as a
  // voucher redemption. Whichever one recognizes it is what happens; an
  // error only shows if neither does. See OtpVerify.jsx for that logic.
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setErrors({});
    setFormError("");
  };

  const validate = () => {
    const next = {};
    if (mode === "signup" && name.trim().length < 2) {
      next.name = "Enter your full name";
    }

    const hasPhone = phone.trim() !== "";
    const hasEmail = email.trim() !== "";

    if (!hasPhone && !hasEmail) {
      next.identifier = "Enter a phone number or an email address";
    } else {
      if (hasPhone && !isValidNigerianPhone(phone)) {
        next.phone = "Enter a valid Nigerian phone number";
      }
      if (hasEmail && !isValidEmail(email)) {
        next.email = "Enter a valid email address";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "signup") {
        const response = await requestSignup({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          promoCode: code.trim(),
        });
        navigate("/login/verify", {
          state: {
            mode,
            phone: phone.trim(),
            email: email.trim(),
            name: name.trim(),
            code: code.trim(),
            // Carried through so OtpVerify knows not to show a "code
            // invalid" error if this already succeeded as a promo code —
            // it only needs to also try voucher redemption, silently.
            promoCodeApplied: response.promoCodeApplied,
          },
        });
      } else {
        await requestLogin({ phone: phone.trim(), email: email.trim() });
        navigate("/login/verify", {
          state: { mode, phone: phone.trim(), email: email.trim() },
        });
      }
    } catch (err) {
      // Backend error messages are shown directly — e.g. "An account
      // already exists for this email", "No account found", or a rate
      // limit message with a retry time.
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setFormError("");
    // Google sign-in isn't configured on the backend yet (see
    // PROJECT_STATUS.md) — the endpoint exists and returns a clear
    // "not_configured" error rather than either faking success or 404ing.
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      setFormError(data.message || "Google sign-in isn't available yet.");
    } catch {
      setFormError("Couldn't reach the server.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Card className="flex flex-col gap-stack-md">
      <div className="flex bg-surface-container-low rounded-lg p-1">
        <button
          onClick={() => switchMode("login")}
          className={`btn-spring flex-1 text-[14px] font-medium rounded-md py-2 transition-colors ${
            mode === "login" ? "bg-surface text-on-surface card-shadow" : "text-text-secondary"
          }`}
        >
          Log In
        </button>
        <button
          onClick={() => switchMode("signup")}
          className={`btn-spring flex-1 text-[14px] font-medium rounded-md py-2 transition-colors ${
            mode === "signup" ? "bg-surface text-on-surface card-shadow" : "text-text-secondary"
          }`}
        >
          Sign Up
        </button>
      </div>

      <div>
        <h1 className="text-[22px] leading-7 font-bold text-on-surface mb-1">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-text-secondary text-[14px]">
          {mode === "signup"
            ? "Sign up with a phone number or an email — whichever's easiest."
            : "Log in with your phone number or email to continue."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-sm">
        {mode === "signup" && (
          <div>
            <label className="text-[12px] text-text-secondary mb-1.5 block">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="e.g. Chidi Okafor"
              autoFocus
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-on-surface text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            {errors.name && <p className="text-error text-[12px] mt-1.5">{errors.name}</p>}
          </div>
        )}

        <div>
          <label className="text-[12px] text-text-secondary mb-1.5 block">
            Phone number <span className="text-text-secondary/70">(or email below)</span>
          </label>
          <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-lg px-4 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
            <span className="text-on-surface-variant text-[14px] pr-2 border-r border-outline-variant mr-2">
              🇳🇬
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="0801 234 5678"
              autoFocus={mode === "login"}
              className="flex-grow bg-transparent py-3 text-on-surface text-[15px] focus:outline-none"
            />
          </div>
          {errors.phone && <p className="text-error text-[12px] mt-1.5">{errors.phone}</p>}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-grow h-px bg-outline-variant" />
          <span className="text-[12px] text-text-secondary">or</span>
          <div className="flex-grow h-px bg-outline-variant" />
        </div>

        <div>
          <label className="text-[12px] text-text-secondary mb-1.5 block">Email address</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-on-surface text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          {errors.email && <p className="text-error text-[12px] mt-1.5">{errors.email}</p>}
        </div>

        {errors.identifier && (
          <p className="text-error text-[12px] -mt-1">{errors.identifier}</p>
        )}

        {mode === "signup" && (
          <div>
            <label className="text-[12px] text-text-secondary mb-1.5 block">
              Code <span className="text-text-secondary/70">(optional)</span>
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              type="text"
              placeholder="Promo or voucher code"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-on-surface text-[15px] uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            <p className="text-[12px] text-text-secondary mt-1.5">
              Have a promo or voucher code? Enter it here — either kind works.
            </p>
          </div>
        )}

        {formError && (
          <p className="text-error text-[13px] bg-error-container/40 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-spring w-full bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            "Sending code..."
          ) : (
            <>
              Continue
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-grow h-px bg-outline-variant" />
        <span className="text-[12px] text-text-secondary">or</span>
        <div className="flex-grow h-px bg-outline-variant" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="btn-spring w-full border border-outline-variant text-on-surface text-[14px] font-medium rounded-lg py-3 hover:bg-surface-container-low disabled:opacity-60 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">account_circle</span>
        {googleLoading
          ? "Connecting..."
          : mode === "signup"
          ? "Continue with Google"
          : "Log in with Google"}
      </button>

      {mode === "signup" && (
        <p className="text-[12px] text-text-secondary text-center">
          By continuing, you agree to Uniready's Terms of Service and Privacy Policy.
        </p>
      )}
    </Card>
  );
}