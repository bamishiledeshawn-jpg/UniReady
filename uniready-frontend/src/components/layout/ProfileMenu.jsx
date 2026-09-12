import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../lib/apiConfig";
import VoucherRedeemedModal from "../voucher/VoucherRedeemedModal";

export default function ProfileMenu({ userAvatarUrl }) {
  const [open, setOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState(null);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setOpen(false);
    logout();
    navigate("/login");
  };

  const handleRedeem = async () => {
    if (!voucherCode.trim()) return;
    setVoucherError("");
    setRedeeming(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/vouchers/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: voucherCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Real backend errors: "Voucher not found or already used", "This
        // voucher was just redeemed — try another code", etc.
        setVoucherError(data.message || "Could not redeem voucher");
        return;
      }

      setVoucherCode("");
      setOpen(false);
      setRedeemResult(data);
    } catch {
      setVoucherError("Couldn't reach the server");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-on-surface hover:bg-surface-container-high rounded-full p-1 transition-colors"
      >
        <img
          className="w-8 h-8 rounded-full object-cover"
          src={userAvatarUrl}
          alt="User avatar"
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface rounded-xl card-shadow p-4 z-50">
          {user?.name && (
            <p className="text-[13px] text-text-secondary mb-3">
              Signed in as <span className="text-on-surface font-medium">{user.name}</span>
            </p>
          )}

          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[16px] font-semibold text-on-surface">Access Pass</h3>
            <span className="bg-success/10 text-success text-[12px] px-2 py-1 rounded">
              Active
            </span>
          </div>

          <div className="bg-primary/5 rounded-lg border border-primary/20 p-4 mb-4">
            <p className="text-[14px] text-primary font-bold mb-1">Weekly Subject Pass</p>
            <p className="text-text-secondary text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              3 days remaining
            </p>
          </div>

          <div className="mb-1">
            <label className="text-[12px] text-text-secondary mb-2 block">
              Redeem Voucher
            </label>
            <div className="flex gap-2">
              <input
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  setVoucherError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                className="flex-grow min-w-0 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-on-surface text-[14px] uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Voucher code"
                type="text"
              />
              <button
                onClick={handleRedeem}
                disabled={redeeming || !voucherCode.trim()}
                className="btn-spring bg-surface-container-high text-on-surface text-[14px] font-medium rounded-lg px-4 py-2 hover:bg-surface-container-highest disabled:opacity-50"
              >
                {redeeming ? "..." : "Apply"}
              </button>
            </div>
            {voucherError && (
              <p className="text-error text-[12px] mt-1.5">{voucherError}</p>
            )}
          </div>

          <div className="border-t border-surface-container-highest mt-4 pt-3">
            <button className="w-full text-left text-[14px] text-on-surface-variant hover:text-primary transition-colors py-1">
              Account Settings
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-left text-[14px] text-on-surface-variant hover:text-error transition-colors py-1"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      <VoucherRedeemedModal result={redeemResult} onClose={() => setRedeemResult(null)} />
    </div>
  );
}
