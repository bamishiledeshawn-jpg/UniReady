// Shown after a successful voucher redemption. When the batch has a
// custom pop-up image, the popup IS the image — no title/message text
// competing with it, just the picture and a close button. The close
// button is absolutely positioned and always visible regardless of the
// image's rendered height, which matters specifically on wide-but-short
// desktop browser windows: previously the only way out was a "Continue"
// button below the image, and on a short viewport that button could end
// up pushed off-screen with no reliable way to scroll down to it.
export default function VoucherRedeemedModal({ result, onClose }) {
  if (!result) return null;

  const popup = result.popup;
  const hasImage = Boolean(popup?.imageUrl);

  const CloseButton = (
    <button
      onClick={onClose}
      className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
      aria-label="Close"
    >
      <span className="material-symbols-outlined text-[20px]">close</span>
    </button>
  );

  if (hasImage) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-margin-mobile">
        <div className="relative w-full max-w-md max-h-[90vh] rounded-2xl overflow-hidden card-shadow">
          <img
            src={popup.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ aspectRatio: "1 / 1" }}
          />
          {CloseButton}
        </div>
      </div>
    );
  }

  // No image configured on this batch — plain success state, unchanged
  // content-wise, just with the same reliable close button added.
  const premiumUntilLabel = result.premiumUntil
    ? new Date(result.premiumUntil).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-margin-mobile">
      <div className="relative bg-surface rounded-2xl card-shadow max-w-sm w-full p-6 flex flex-col items-center text-center gap-3">
        {CloseButton}

        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-success text-3xl">
            check_circle
          </span>
        </div>

        <h3 className="text-[18px] font-bold text-on-surface">
          {popup?.title || "Voucher Redeemed!"}
        </h3>

        <p className="text-[14px] text-text-secondary">
          {popup?.message ||
            "Your voucher was applied successfully — enjoy your Premium access."}
        </p>

        {premiumUntilLabel && (
          <p className="text-[12px] text-primary font-medium bg-primary/5 rounded-full px-3 py-1">
            Premium active until {premiumUntilLabel}
          </p>
        )}

        <button
          onClick={onClose}
          className="btn-spring w-full bg-primary text-on-primary text-[14px] font-medium rounded-lg py-2.5 hover:bg-primary-hover mt-2"
        >
          Continue
        </button>
      </div>
    </div>
  );
}