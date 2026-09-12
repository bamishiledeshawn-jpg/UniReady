import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const BASE_PRICE = 1000;
const QTY_OPTIONS = [
  { value: 10, label: "Base Rate" },
  { value: 50, label: "5% Off" },
  { value: 100, label: "10% Off" },
  { value: 500, label: "20% Off" },
];
const EXAM_OPTIONS = [
  { value: "jamb", label: "JAMB UTME Preparation" },
  { value: "waec", label: "WAEC SSCE (Senior Secondary)" },
  { value: "neco", label: "NECO SSCE" },
  { value: "post_utme", label: "Post-UTME Screenings" },
];

function formatCurrency(amount) {
  return "₦" + amount.toLocaleString("en-NG");
}

function getDiscount(quantity) {
  if (quantity >= 500) return 0.2;
  if (quantity >= 100) return 0.1;
  if (quantity >= 50) return 0.05;
  return 0;
}

export default function BusinessGenerate() {
  const navigate = useNavigate();
  const [examType, setExamType] = useState("jamb");
  const [selectedQty, setSelectedQty] = useState(10);
  const [customQty, setCustomQty] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const quantity = useMemo(() => {
    const custom = parseInt(customQty, 10);
    if (customQty && custom >= 5) return custom;
    return selectedQty;
  }, [customQty, selectedQty]);

  const discountRate = getDiscount(quantity);
  const unitPrice = BASE_PRICE * (1 - discountRate);
  const total = quantity * unitPrice;
  const savedAmount = BASE_PRICE * quantity - total;
  const examLabel = EXAM_OPTIONS.find((e) => e.value === examType)?.label ?? "";

  function handleQtySelect(value) {
    setSelectedQty(value);
    setCustomQty("");
  }

  function handleCustomInput(value) {
    setCustomQty(value);
  }

  function handleGenerate() {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setShowModal(true);
    }, 1200);
  }

  return (
    <div className="flex flex-col gap-stack-lg">
      <header>
        <div className="hidden md:flex items-center gap-2 mb-2 text-[14px]">
          <Link to="/business" className="text-text-secondary hover:text-primary transition-colors">
            Business Portal
          </Link>
          <span className="material-symbols-outlined text-sm text-text-secondary">
            chevron_right
          </span>
          <span className="font-bold text-primary">Generate Batch</span>
        </div>
        <h2 className="text-[32px] leading-10 font-bold text-on-surface mb-2">
          Generate Voucher Batch
        </h2>
        <p className="text-text-secondary max-w-2xl">
          Configure and generate securely encrypted PINs for your students. Real-time
          volume discounts are applied automatically.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg">
        {/* Form Area */}
        <div className="lg:col-span-8 flex flex-col gap-stack-md">
          {/* Exam Selection */}
          <div className="bg-surface border border-surface-container-highest rounded-xl p-stack-md card-shadow">
            <div className="flex items-center gap-2 mb-stack-md">
              <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">
                description
              </span>
              <h3 className="text-[18px] font-semibold text-on-surface">
                Select Examination
              </h3>
            </div>
            <div className="relative">
              <select
                className="appearance-none w-full bg-surface-container-low border border-surface-container-highest text-on-surface rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer hover:bg-surface-container"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
              >
                {EXAM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-secondary">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
            <p className="text-[12px] text-text-secondary mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              Ensures generated PINs grant access to specific curriculum pools.
            </p>
          </div>

          {/* Quantity Stepper */}
          <div className="bg-surface border border-surface-container-highest rounded-xl p-stack-md card-shadow">
            <div className="flex items-center justify-between mb-stack-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">
                  layers
                </span>
                <h3 className="text-[18px] font-semibold text-on-surface">
                  Batch Quantity
                </h3>
              </div>
              <span className="bg-surface-container-high px-3 py-1 rounded-full text-[12px] text-text-secondary">
                Volume Tiers Active
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {QTY_OPTIONS.map((opt) => {
                const active = !customQty && selectedQty === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleQtySelect(opt.value)}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all h-full ${
                      active
                        ? "border-primary bg-primary-container/20 text-on-primary-container"
                        : "border-surface-container-highest hover:bg-surface-container-low"
                    }`}
                  >
                    <span className="text-[24px] leading-8 font-bold mb-1">
                      {opt.value}
                    </span>
                    {opt.value === 10 ? (
                      <span className="text-[12px] text-text-secondary">
                        {opt.label}
                      </span>
                    ) : (
                      <span className="text-[12px] text-success flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">
                          trending_down
                        </span>
                        {opt.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-transparent focus-within:border-primary focus-within:bg-surface transition-colors">
              <span className="material-symbols-outlined text-text-secondary">edit</span>
              <div className="flex-1">
                <label className="sr-only" htmlFor="custom-qty">
                  Custom Quantity
                </label>
                <input
                  id="custom-qty"
                  type="number"
                  value={customQty}
                  onChange={(e) => handleCustomInput(e.target.value)}
                  placeholder="Or enter custom quantity (Min 5)"
                  className="w-full bg-transparent border-none focus:ring-0 text-on-surface p-0 placeholder:text-outline-variant"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4">
          <div className="bg-surface border border-surface-container-highest rounded-xl p-stack-md card-shadow sticky top-24 flex flex-col h-full max-h-[500px]">
            <h3 className="text-[18px] font-semibold text-on-surface mb-stack-md border-b border-surface-container-highest pb-4">
              Order Summary
            </h3>
            <div className="flex-1 space-y-4 mb-stack-md">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Exam Pool</span>
                <span className="text-[14px] font-medium text-on-surface">
                  {examLabel}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Voucher Quantity</span>
                <span className="text-[14px] font-medium text-on-surface">
                  {quantity.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Unit Price</span>
                <span className="text-[14px] font-medium text-on-surface">
                  {formatCurrency(unitPrice)}
                </span>
              </div>
              <div className="pt-4 border-t border-surface-container-highest border-dashed">
                <div className="flex justify-between items-end">
                  <span className="text-on-surface font-semibold">Total Cost</span>
                  <div className="text-right">
                    <span className="text-[32px] leading-10 text-primary block leading-none font-bold">
                      {formatCurrency(total)}
                    </span>
                    <span
                      className={`text-[12px] ${
                        discountRate > 0 ? "text-success" : "text-text-secondary"
                      }`}
                    >
                      {discountRate > 0
                        ? `You save ${formatCurrency(savedAmount)} (${discountRate * 100}%)`
                        : "No volume discount applied"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-auto">
              <div className="bg-surface-container-low p-3 rounded-lg mb-4 flex gap-2 items-start">
                <span className="material-symbols-outlined text-warning text-[18px] mt-0.5">
                  shield_lock
                </span>
                <p className="text-[12px] text-text-secondary leading-tight">
                  PINs are generated instantly and stored securely in your business
                  vault. Unused PINs do not expire.
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-spring w-full bg-primary text-on-primary h-14 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 shadow-sm disabled:opacity-80"
              >
                {generating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">generating_tokens</span>
                    Confirm &amp; Generate PINs
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="bg-surface rounded-2xl p-stack-lg max-w-md w-full relative z-10 shadow-xl border border-surface-container-highest flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-stack-md">
              <span
                className="material-symbols-outlined text-[48px] text-success"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <h2 className="text-[32px] leading-10 font-bold text-on-surface mb-2">
              Batch Generated Successfully!
            </h2>
            <p className="text-text-secondary mb-stack-lg">
              <span className="font-bold text-on-surface">
                {quantity.toLocaleString()}
              </span>{" "}
              PINs have been added to your vault. You can now distribute them to your
              students.
            </p>
            <div className="w-full space-y-3">
              <button className="btn-spring w-full bg-primary text-on-primary h-12 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                Download PDF
              </button>
              <button className="btn-spring w-full bg-surface-container text-on-surface h-12 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 border border-surface-container-highest">
                <span className="material-symbols-outlined text-[#25D366]">chat</span>
                Export PINs for WhatsApp
              </button>
            </div>
            <button
              className="mt-4 text-[14px] font-medium text-text-secondary hover:text-primary transition-colors p-2"
              onClick={() => {
                setShowModal(false);
                navigate("/business");
              }}
            >
              Close &amp; Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
