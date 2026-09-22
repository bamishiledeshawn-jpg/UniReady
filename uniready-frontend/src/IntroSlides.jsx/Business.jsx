import { Link } from "react-router-dom";

const BATCHES = [
  { id: "#VB-10492", date: "Oct 24, 2023", qty: "50 Pins", price: "50,000", status: "Active" },
  { id: "#VB-10491", date: "Oct 15, 2023", qty: "100 Pins", price: "100,000", status: "Depleted" },
  { id: "#VB-10490", date: "Sep 28, 2023", qty: "25 Pins", price: "25,000", status: "Depleted" },
];

export default function Business() {
  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="text-[32px] leading-10 font-bold text-on-surface mb-1">
          Business Hub
        </h1>
        <p className="text-text-secondary">
          Manage your vouchers, track commissions, and grow your student base.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Quick Stats */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-gutter">
          <div className="bg-surface rounded-xl border border-surface-container-highest p-stack-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[14px] font-medium text-text-secondary">
                Vouchers Sold
              </span>
              <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-full">
                receipt_long
              </span>
            </div>
            <div>
              <p className="text-[32px] leading-10 font-bold text-on-surface">1,245</p>
              <p className="text-[12px] text-success flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                +12% this month
              </p>
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-surface-container-highest p-stack-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[14px] font-medium text-text-secondary">
                Commission
              </span>
              <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-full">
                account_balance_wallet
              </span>
            </div>
            <div>
              <p className="text-[32px] leading-10 font-bold text-on-surface">₦124,500</p>
              <p className="text-[12px] text-success flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                +5% this month
              </p>
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-surface-container-highest p-stack-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[14px] font-medium text-text-secondary">
                Active Users
              </span>
              <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-full">
                group
              </span>
            </div>
            <div>
              <p className="text-[32px] leading-10 font-bold text-on-surface">892</p>
              <p className="text-[12px] text-text-secondary mt-1">From your referrals</p>
            </div>
          </div>
        </div>

        {/* Promo Code Card */}
        <div className="md:col-span-4 bg-primary text-on-primary rounded-xl p-stack-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-secondary/30 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h3 className="text-[14px] font-semibold mb-2 opacity-90">
              Your Agent Promo Code
            </h3>
            <div className="bg-black/20 rounded-lg p-3 flex justify-between items-center mb-6">
              <span className="text-[24px] leading-8 font-bold tracking-wider">
                JPREP-AGY-459
              </span>
            </div>
          </div>
          <div className="relative z-10 flex flex-col gap-3">
            <button className="btn-spring w-full bg-white text-primary text-[14px] font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">content_copy</span>
              Copy Code
            </button>
            <button className="btn-spring w-full bg-transparent border border-white/30 text-white hover:bg-white/10 transition-colors text-[14px] font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">share</span>
              Share to WhatsApp
            </button>
          </div>
        </div>

        {/* Voucher Batches Table */}
        <div className="md:col-span-12 bg-surface rounded-xl border border-surface-container-highest overflow-hidden">
          <div className="p-stack-md border-b border-surface-container-highest flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-[24px] leading-8 font-bold text-on-surface">
                Voucher Batches
              </h2>
              <p className="text-text-secondary">Manage your generated access pins.</p>
            </div>
            <Link
              to="/business/generate"
              className="btn-spring bg-primary hover:bg-primary-hover text-on-primary transition-colors text-[14px] font-medium py-3 px-6 rounded-lg flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Generate New Batch
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-container-highest">
                  <th className="text-[12px] font-semibold text-text-secondary p-4 uppercase tracking-wider">
                    Batch ID
                  </th>
                  <th className="text-[12px] font-semibold text-text-secondary p-4 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-[12px] font-semibold text-text-secondary p-4 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="text-[12px] font-semibold text-text-secondary p-4 uppercase tracking-wider">
                    Price (₦)
                  </th>
                  <th className="text-[12px] font-semibold text-text-secondary p-4 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-[12px] font-semibold text-text-secondary p-4 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest">
                {BATCHES.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="p-4 text-on-surface font-medium">{b.id}</td>
                    <td className="p-4 text-text-secondary">{b.date}</td>
                    <td className="p-4 text-on-surface">{b.qty}</td>
                    <td className="p-4 text-on-surface">{b.price}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          b.status === "Active"
                            ? "bg-success/10 text-success"
                            : "bg-surface-container-highest text-on-surface-variant"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="btn-spring text-primary hover:text-primary-hover transition-colors p-2">
                        <span className="material-symbols-outlined">download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-surface-container-highest flex justify-center">
            <button className="text-primary text-[14px] font-medium hover:underline">
              View All Batches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
