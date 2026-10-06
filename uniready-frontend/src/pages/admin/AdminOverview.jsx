import { useEffect, useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
const count = new Intl.NumberFormat("en-NG");

function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function Kpi({ label, value, hint, icon }) {
  return (
    <div className="bg-surface rounded-xl card-shadow p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between text-text-secondary">
        <span className="text-[14px]">{label}</span>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <p className="text-[28px] leading-8 font-bold text-on-surface">{value}</p>
      {hint && <p className="text-[12px] text-text-secondary">{hint}</p>}
    </div>
  );
}

function Meter({ label, part, whole, detail }) {
  const value = pct(part, whole);
  return (
    <div className="bg-surface rounded-xl card-shadow p-5">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[14px] font-medium text-on-surface">{label}</span>
        <span className="text-[14px] font-bold text-primary">{value}%</span>
      </div>
      <div className="h-3 rounded-full bg-surface-container-high overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
      </div>
      <p className="text-[12px] text-text-secondary mt-2">{detail}</p>
    </div>
  );
}

export default function AdminOverview() {
  const { adminFetch } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminFetch("/stats/overview")
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [adminFetch]);

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h2 className="text-[28px] leading-9 font-bold text-on-surface">Overview</h2>
        <p className="text-text-secondary">A snapshot of users, revenue and vouchers.</p>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container text-[14px] rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!stats && !error && <p className="text-text-secondary">Loading...</p>}

      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-stack-md">
            <Kpi
              label="Total users"
              value={count.format(stats.totalUsers)}
              hint={`${count.format(stats.newUsers7d)} joined in the last 7 days`}
              icon="group"
            />
            <Kpi
              label="Active premium"
              value={count.format(stats.activePremiumUsers)}
              hint="Users with unexpired premium"
              icon="workspace_premium"
            />
            <Kpi
              label="Revenue"
              value={naira.format(stats.revenueKobo / 100)}
              hint="From completed purchases"
              icon="payments"
            />
            <Kpi
              label="Commissions owed"
              value={naira.format(stats.pendingCommissionKobo / 100)}
              hint="Unpaid promo code commissions"
              icon="account_balance_wallet"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-md">
            <Meter
              label="Premium share of users"
              part={stats.activePremiumUsers}
              whole={stats.totalUsers}
              detail={`${count.format(stats.activePremiumUsers)} of ${count.format(stats.totalUsers)} users`}
            />
            <Meter
              label="Vouchers redeemed"
              part={stats.vouchersRedeemed}
              whole={stats.vouchersGenerated}
              detail={`${count.format(stats.vouchersRedeemed)} of ${count.format(stats.vouchersGenerated)} generated`}
            />
          </div>
        </>
      )}
    </div>
  );
}
