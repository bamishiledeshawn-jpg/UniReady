import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiConfig";
import VoucherRedeemedModal from "../components/voucher/VoucherRedeemedModal";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60; // matches the backend's per-identifier cooldown exactly

export default function OtpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, requestSignup, requestLogin } = useAuth();
  const { mode, phone, email, name, code: signupCode, promoCodeApplied } = location.state || {};

  // Whichever identifier was actually provided — phone takes priority if
  // both exist, matching how the backend resolves it (see auth.go).
  const identifier = phone || email;
  const identifierLabel = phone ? "phone number" : "email";

  // A brand-new account goes through onboarding (pick an exam, quick
  // diagnostic) before landing on the dashboard; an existing user
  // logging back in skips straight there — they've already done this.
  const postVerifyDestination = mode === "signup" ? "/onboarding" : "/";

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef([]);

  // Set only if the entered code redeemed successfully as a voucher —
  // drives showing VoucherRedeemedModal before the dashboard.
  const [voucherResult, setVoucherResult] = useState(null);

  useEffect(() => {
    if (!identifier) navigate("/login", { replace: true });
  }, [identifier, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError("");
    if (clean && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] || ""));
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  // Tries the entered code as a voucher redemption. Only shows an error
  // on the dashboard if the code wasn't ALSO already recognized as a
  // promo code at signup (promoCodeApplied) — a code that's a valid
  // promo code but not a valid voucher isn't an error, it just means it
  // was the other kind of code, silently.
  const redeemVoucherIfAny = async (token) => {
    const code = (signupCode || "").trim();
    if (!code) {
      navigate(postVerifyDestination, { replace: true });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/vouchers/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // Show the popup now — dashboard only after they dismiss it.
        setVoucherResult(data);
      } else if (promoCodeApplied) {
        // Already recognized as a promo code — the voucher attempt
        // failing is expected, not an error worth surfacing.
        navigate(postVerifyDestination, { replace: true });
      } else {
        navigate(postVerifyDestination, {
          replace: true,
          state: { voucherError: "That code wasn't recognized — no discount or voucher applied." },
        });
      }
    } catch {
      navigate(postVerifyDestination, {
        replace: true,
        state: { voucherError: "Couldn't reach the server to apply your code" },
      });
    }
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError("Enter the full 6-digit code");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const { token } = await verifyOtp({ phone, email, code });
      await redeemVoucherIfAny(token);
    } catch (err) {
      // Real backend error messages: "Incorrect code", "Code expired or
      // not found — request a new one.", "Too many incorrect attempts —
      // request a new code."
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    try {
      if (mode === "login") {
        await requestLogin({ phone, email });
      } else {
        await requestSignup({ phone, email, name, promoCode: signupCode });
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!identifier) return null;

  return (
    <>
      <Card className="flex flex-col gap-stack-md">
        <div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-[13px] text-text-secondary hover:text-primary transition-colors mb-3"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back
          </Link>
          <h1 className="text-[22px] leading-7 font-bold text-on-surface mb-1">
            Enter the code
          </h1>
          <p className="text-text-secondary text-[14px]">
            We sent a 6-digit code to your {identifierLabel}:{" "}
            <span className="text-on-surface font-medium">{identifier}</span>
          </p>
        </div>

        <div>
          <div className="flex gap-2 justify-between" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                autoFocus={i === 0}
                className="w-full aspect-square text-center text-[20px] font-bold bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            ))}
          </div>
          {error && (
            <p className="text-error text-[12px] mt-1.5">
              {error}
              {mode === "login" && error.toLowerCase().includes("no account") && (
                <>
                  {" "}
                  <Link to="/login" className="underline font-medium">
                    Sign up
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="btn-spring w-full bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <div className="text-center text-[13px] text-text-secondary">
          {cooldown > 0 ? (
            <span>Resend code in {cooldown}s</span>
          ) : (
            <button onClick={handleResend} className="text-primary font-medium hover:underline">
              Resend code
            </button>
          )}
        </div>
      </Card>

      <VoucherRedeemedModal
        result={voucherResult}
        onClose={() => navigate(postVerifyDestination, { replace: true })}
      />
    </>
  );
}