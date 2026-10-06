import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";

const MAX_QUANTITY = 500;
const MAX_DAYS = 730;

function csvSafe(value) {
  const text = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(label, premiumDays, codes) {
  const rows = ["code,batch,premium_days", ...codes.map((c) => `${c},${csvSafe(label)},${premiumDays}`)];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "vouchers"}-vouchers.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const inputClass =
  "w-full bg-surface-container-low border border-surface-container-highest text-on-surface rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

export default function AdminVouchers() {
  const { adminFetch } = useAdminAuth();

  const [label, setLabel] = useState("");
  const [premiumDays, setPremiumDays] = useState(180);
  const [quantity, setQuantity] = useState(50);
  const [withPopup, setWithPopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupImageUrl, setPopupImageUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const [batches, setBatches] = useState([]);
  const [batchesError, setBatchesError] = useState("");

  const loadBatches = useCallback(() => {
    return adminFetch("/voucher-batches")
      .then((data) => {
        setBatches(data.batches);
        setBatchesError("");
      })
      .catch((err) => setBatchesError(err.message));
  }, [adminFetch]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        label: label.trim(),
        premiumDays: Number(premiumDays),
        quantity: Number(quantity),
      };
      if (withPopup) {
        body.popupTitle = popupTitle;
        body.popupMessage = popupMessage;
        body.popupImageUrl = popupImageUrl;
      }
      const data = await adminFetch("/voucher-batches", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResult({ label: data.batch.label, premiumDays: data.batch.premiumDays, codes: data.codes });
      setCopied(false);
      setLabel("");
      loadBatches();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(result.codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h2 className="text-[28px] leading-9 font-bold text-on-surface">Vouchers</h2>
        <p className="text-text-secondary">Generate a batch of single-use premium codes.</p>
      </div>

      {result && (
        <div className="bg-surface rounded-xl card-shadow border-2 border-primary p-5 flex flex-col gap-stack-md">
          <div className="bg-warning/15 text-on-surface text-[14px] rounded-lg px-4 py-3">
            <strong>Save these codes now.</strong> They are stored encrypted and this is the only time they can be
            shown.
          </div>
          <p className="text-[14px] text-text-secondary">
            {result.codes.length} codes for <strong className="text-on-surface">{result.label}</strong>,{" "}
            {result.premiumDays} days of premium each.
          </p>
          <pre className="bg-surface-container-low rounded-lg p-4 text-[14px] font-mono max-h-64 overflow-y-auto">
            {result.codes.join("\n")}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadCsv(result.label, result.premiumDays, result.codes)}
              className="bg-primary hover:bg-primary-hover text-on-primary font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={copyAll}
              className="border border-surface-container-highest text-on-surface font-semibold rounded-lg px-4 py-2 hover:bg-surface-container-low transition-colors"
            >
              {copied ? "Copied" : "Copy all"}
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="text-text-secondary font-medium px-4 py-2 hover:text-primary transition-colors"
            >
              I have saved them, close
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface rounded-xl card-shadow p-5 flex flex-col gap-stack-md">
        <h3 className="text-[18px] font-semibold text-on-surface">New batch</h3>

        {error && (
          <div className="bg-error-container text-on-error-container text-[14px] rounded-lg px-4 py-3">{error}</div>
        )}

        <label className="flex flex-col gap-1 text-[14px] font-medium text-on-surface">
          Batch label
          <input
            required
            maxLength={120}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Greenfield Academy, Term 1"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
          <label className="flex flex-col gap-1 text-[14px] font-medium text-on-surface">
            Premium days per code
            <input
              type="number"
              required
              min={1}
              max={MAX_DAYS}
              value={premiumDays}
              onChange={(e) => setPremiumDays(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-[14px] font-medium text-on-surface">
            Number of codes
            <input
              type="number"
              required
              min={1}
              max={MAX_QUANTITY}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-[14px] text-on-surface">
          <input type="checkbox" checked={withPopup} onChange={(e) => setWithPopup(e.target.checked)} />
          Show a custom pop-up when these codes are redeemed
        </label>

        {withPopup && (
          <div className="flex flex-col gap-stack-md">
            <label className="flex flex-col gap-1 text-[14px] font-medium text-on-surface">
              Pop-up title
              <input
                maxLength={120}
                value={popupTitle}
                onChange={(e) => setPopupTitle(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-[14px] font-medium text-on-surface">
              Pop-up message
              <textarea
                rows={3}
                maxLength={500}
                value={popupMessage}
                onChange={(e) => setPopupMessage(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-[14px] font-medium text-on-surface">
              Pop-up image link (optional)
              <input
                type="url"
                value={popupImageUrl}
                onChange={(e) => setPopupImageUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="self-start bg-primary hover:bg-primary-hover text-on-primary font-semibold rounded-lg px-5 py-3 transition-colors disabled:opacity-60"
        >
          {busy ? "Generating..." : "Generate codes"}
        </button>
      </form>

      <div className="bg-surface rounded-xl card-shadow p-5">
        <h3 className="text-[18px] font-semibold text-on-surface mb-stack-md">Batches</h3>

        {batchesError && (
          <div className="bg-error-container text-on-error-container text-[14px] rounded-lg px-4 py-3 mb-stack-md">
            {batchesError}
          </div>
        )}

        {batches.length === 0 && !batchesError && (
          <p className="text-[14px] text-text-secondary">No batches yet.</p>
        )}

        <ul className="flex flex-col divide-y divide-surface-container-highest">
          {batches.map((b) => {
            const share = b.total > 0 ? Math.round((b.redeemed / b.total) * 100) : 0;
            return (
              <li key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-on-surface truncate">{b.label}</p>
                  <p className="text-[12px] text-text-secondary">
                    {new Date(b.createdAt).toLocaleDateString()}
                    {b.premiumDays ? ` · ${b.premiumDays} days` : ""}
                    {b.hasPopup ? " · custom pop-up" : ""}
                  </p>
                </div>
                <div className="sm:w-56">
                  <div className="flex justify-between text-[12px] text-text-secondary mb-1">
                    <span>
                      {b.redeemed} of {b.total} redeemed
                    </span>
                    <span>{share}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
