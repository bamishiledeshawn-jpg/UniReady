import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiConfig";

// Was previously a fully-mocked voucher-batch/agency dashboard — that
// whole feature set (buying/generating vouchers, partner analytics) has
// moved to its own separate app, UniReady Business. What's left here is
// just the one thing students actually do: get their own promo code.
//
// No batches, no commission stats, no fake numbers — this fetches/creates
// a single real code from the backend. Real commission/earnings display
// is a later addition once the payout-tracking backend work exists.
export default function Business() {
  const { token } = useAuth();
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrCreateCode() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/promo-codes/me`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Couldn't load your promo code");
        if (!cancelled) setCode(data.code);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrCreateCode();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-stack-lg max-w-lg">
      <div>
        <h1 className="text-[32px] leading-10 font-bold text-on-surface mb-1">
          Your Promo Code
        </h1>
        <p className="text-text-secondary">
          Share this with friends — when they use it to pay for premium,
          they get a discount and you earn a commission.
        </p>
      </div>

      <div className="bg-primary text-on-primary rounded-xl p-stack-md flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-secondary/30 rounded-full blur-3xl" />

        <div className="relative z-10">
          {loading && <p className="opacity-80 text-[15px]">Loading your code…</p>}
          {error && <p className="text-[15px]">{error}</p>}
          {code && (
            <div className="bg-black/20 rounded-lg p-3 flex justify-between items-center mb-6">
              <span className="text-[24px] leading-8 font-bold tracking-wider">
                {code}
              </span>
            </div>
          )}
        </div>

        {code && (
          <div className="relative z-10 flex flex-col gap-3">
            <button
              onClick={handleCopy}
              className="btn-spring w-full bg-white text-primary text-[14px] font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}