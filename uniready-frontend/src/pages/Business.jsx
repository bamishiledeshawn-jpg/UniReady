import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiConfig";

// Two states, deliberately not auto-generating a code on page load:
//   1. No code yet — explains how the system works, one big
//      "Generate Promo Code" button. Nothing happens until they choose to.
//   2. Has a code — real stats dashboard (referrals, paid conversions,
//      pending earnings, next payout date), all from the backend.
export default function Business() {
  const { token } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | none | has-code
  const [stats, setStats] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/promo-codes/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Couldn't load your promo code");
        if (cancelled) return;
        if (data.hasCode) {
          setStats(data);
          setStatus("has-code");
        } else {
          setStatus("none");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setStatus("none");
        }
      }
    }
    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/promo-codes/me`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't generate a code");
      // Re-fetch full stats now that a code exists, rather than assuming
      // zeroes — keeps this in sync with GetOwn's response shape instead
      // of duplicating it here.
      const statsRes = await fetch(`${API_BASE_URL}/api/v1/promo-codes/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      setStats(statsData);
      setStatus("has-code");
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!stats?.code) return;
    navigator.clipboard.writeText(stats.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "loading") {
    return <p className="text-text-secondary">Loading…</p>;
  }

  if (status === "none") {
    return (
      <div className="flex flex-col items-center text-center gap-stack-lg max-w-lg mx-auto pt-4">
        <div>
          <h1 className="text-[32px] leading-10 font-bold text-on-surface mb-1">
            Earn with your own promo code
          </h1>
          <p className="text-text-secondary">
            Get a personal code to share with friends. When someone uses
            it to sign up, they get a discount when they pay for premium
            — and you earn a commission on what they pay, every time.
          </p>
        </div>

        <div className="w-full text-left bg-surface rounded-xl border border-surface-container-highest p-stack-md flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">percent</span>
            <p className="text-[15px] text-on-surface">
              Your friend gets a discount when they buy premium with your
              code.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            <p className="text-[15px] text-on-surface">
              You earn a percentage of what they actually pay — not the
              full price — every time they use it.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            <p className="text-[15px] text-on-surface">
              Earnings are paid out every two weeks, on a fixed schedule.
            </p>
          </div>
        </div>

        {error && <p className="text-error text-[14px]">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-spring w-full bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 px-6 hover:bg-primary-hover disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate Promo Code"}
        </button>
      </div>
    );
  }

  // status === "has-code"
  const pendingNaira = (stats.pendingEarningsKobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });

  return (
    <div className="flex flex-col gap-stack-lg w-full">
      <div>
        <h1 className="text-[32px] leading-10 font-bold text-on-surface mb-1">
          Your Promo Code
        </h1>
        <p className="text-text-secondary">
          Share this with friends to start earning.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-gutter items-stretch">
        <div className="bg-primary text-on-primary rounded-xl p-stack-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-secondary/30 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="bg-black/20 rounded-lg p-3 flex justify-between items-center mb-6">
              <span className="text-[24px] leading-8 font-bold tracking-wider">
                {stats.code}
              </span>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="relative z-10 btn-spring w-full bg-white text-primary text-[14px] font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">{copied ? "check" : "content_copy"}</span>
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>

        <EarningsChart history={stats.earningsHistory || []} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
        <div className="bg-surface rounded-xl border border-surface-container-highest p-stack-md">
          <p className="text-[14px] text-text-secondary mb-1">People referred</p>
          <p className="text-[28px] font-bold text-on-surface">{stats.referredSignups}</p>
        </div>
        <div className="bg-surface rounded-xl border border-surface-container-highest p-stack-md">
          <p className="text-[14px] text-text-secondary mb-1">Paid with your code</p>
          <p className="text-[28px] font-bold text-on-surface">{stats.paidConversions}</p>
        </div>
        <div className="bg-surface rounded-xl border border-surface-container-highest p-stack-md flex flex-col justify-between">
          <p className="text-[14px] text-text-secondary mb-1">Pending earnings</p>
          <p className="text-[28px] font-bold text-on-surface">{pendingNaira}</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-container-highest p-stack-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">calendar_month</span>
          <p className="text-[15px] text-on-surface">Next payout</p>
        </div>
        <p className="text-[16px] font-semibold text-on-surface">{stats.nextPayoutDate}</p>
      </div>
    </div>
  );
}

// Hand-rolled bar chart, same approach as the app's existing charts
// (PerformanceCharts.jsx) rather than pulling in a charting library for
// one small graph. Plots real per-day commission totals — days with no
// redemptions show as flat zero, which is correct, not a placeholder.
function EarningsChart({ history }) {
  const width = 480;
  const height = 220;
  const padding = 28;
  const maxKobo = Math.max(...history.map((h) => h.amountKobo), 1);
  const barWidth = history.length ? (width - padding * 2) / history.length : 0;

  const allZero = history.every((h) => h.amountKobo === 0);

  return (
    <div className="bg-surface rounded-xl border border-surface-container-highest p-stack-md flex flex-col">
      <p className="text-[14px] text-text-secondary mb-2">Earnings — last 14 days</p>
      <div className="flex-1 flex items-center justify-center min-h-[180px]">
        {allZero ? (
          <p className="text-text-secondary text-[14px] text-center px-4">
            No earnings yet — this fills in once someone pays using your code.
          </p>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {history.map((point, i) => {
              const barHeight = (point.amountKobo / maxKobo) * (height - padding * 2);
              const x = padding + i * barWidth;
              const y = height - padding - barHeight;
              return (
                <rect
                  key={point.date}
                  x={x + barWidth * 0.15}
                  y={y}
                  width={barWidth * 0.7}
                  height={Math.max(barHeight, 1)}
                  rx={3}
                  className="fill-primary"
                />
              );
            })}
            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              className="stroke-surface-container-highest"
              strokeWidth={1}
            />
          </svg>
        )}
      </div>
    </div>
  );
}