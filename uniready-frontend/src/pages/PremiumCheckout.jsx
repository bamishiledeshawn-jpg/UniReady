import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiConfig";

// Paystack Popup (inline JS) rather than a redirect flow — no extra
// page navigation, matches the rest of this app's speed priority. The
// script is loaded on demand, not in index.html, so it only costs
// anything on the one page that actually needs it.
const PAYSTACK_SCRIPT_URL = "https://js.paystack.co/v1/inline.js";

function loadPaystackScript() {
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PAYSTACK_SCRIPT_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Couldn't load the payment provider"));
    document.body.appendChild(script);
  });
}

// The webhook is what actually grants premium — this poll just waits
// for that to land before telling the user "you're done", since the
// webhook can arrive a second or two after Paystack's own popup fires
// its success callback. If it never resolves within these attempts,
// the purchase likely still succeeded (the webhook is the source of
// truth) — the message below says as much rather than implying failure.
async function pollPurchaseStatus(reference, token) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(`${API_BASE_URL}/api/v1/purchases/${reference}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (data.status === "success") return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export default function PremiumCheckout() {
  const { token, refreshMe } = useAuth();
  const [promoCode, setPromoCode] = useState("");
  const [stage, setStage] = useState("idle"); // idle | initializing | paying | confirming | success | error
  const [error, setError] = useState(null);
  const [amountKobo, setAmountKobo] = useState(null);

  // Auto-fill with whatever code they used at signup, if any — still
  // editable, this is just a starting value so they don't have to
  // re-type something they already gave once.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.appliedPromoCode) setPromoCode(data.appliedPromoCode);
      })
      .catch(() => {
        // Non-fatal — worst case the field just starts blank.
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleBuy = async () => {
    setError(null);
    setStage("initializing");
    try {
      const initRes = await fetch(`${API_BASE_URL}/api/v1/purchases/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ promoCode: promoCode.trim() }),
      });
      const initData = await initRes.json().catch(() => ({}));
      if (!initRes.ok) throw new Error(initData.message || "Couldn't start checkout");

      setAmountKobo(initData.amountKobo);
      await loadPaystackScript();

      setStage("paying");
      const handler = window.PaystackPop.setup({
        key: initData.publicKey,
        email: initData.email,
        amount: initData.amountKobo,
        ref: initData.reference,
        currency: "NGN",
        onClose: () => {
          setStage("idle");
        },
        callback: async () => {
          // This fires on the client the instant Paystack's popup
          // reports success — it is NOT proof of payment by itself
          // (see pollPurchaseStatus comment above for why the webhook
          // is what actually matters).
          setStage("confirming");
          const confirmed = await pollPurchaseStatus(initData.reference, token);
          if (confirmed) refreshMe();
          setStage(confirmed ? "success" : "unconfirmed");
        },
      });
      handler.openIframe();
    } catch (err) {
      setError(err.message);
      setStage("error");
    }
  };

  if (stage === "success") {
    return (
      <div className="max-w-md mx-auto pt-12 text-center">
        <span className="material-symbols-outlined text-6xl text-success mb-4">check_circle</span>
        <h1 className="text-[26px] font-bold text-on-surface mb-2">You're Premium!</h1>
        <p className="text-text-secondary">Your access is active — head back to your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-12 px-4">
      <h1 className="text-[28px] font-bold text-on-surface mb-2">Get Premium</h1>
      <p className="text-text-secondary mb-6">
        6 months of full access — no ads, video breakdowns, in-depth review, and downloads.
      </p>

      <input
        type="text"
        placeholder="Promo code (optional)"
        value={promoCode}
        onChange={(e) => setPromoCode(e.target.value)}
        className="w-full border border-outline-variant rounded-lg px-4 py-3 text-[15px] mb-4"
      />

      {error && <p className="text-error text-[14px] mb-4">{error}</p>}

      {stage === "unconfirmed" && (
        <p className="text-warning text-[14px] mb-4">
          Payment may still be processing — check back on your dashboard in a moment before trying again.
        </p>
      )}

      <button
        onClick={handleBuy}
        disabled={stage === "initializing" || stage === "paying" || stage === "confirming"}
        className="btn-spring w-full bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 px-6 hover:bg-primary-hover disabled:opacity-50"
      >
        {stage === "initializing" && "Starting checkout…"}
        {stage === "paying" && "Waiting for payment…"}
        {stage === "confirming" && "Confirming…"}
        {(stage === "idle" || stage === "error" || stage === "unconfirmed") &&
          `Pay ${amountKobo ? `₦${(amountKobo / 100).toLocaleString("en-NG")}` : "Now"}`}
      </button>
    </div>
  );
}