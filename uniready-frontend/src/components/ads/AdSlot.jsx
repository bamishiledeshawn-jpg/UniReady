import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { SPONSORS } from "../../lib/sponsors";

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT;
const DEFAULT_SLOT = import.meta.env.VITE_ADSENSE_SLOT_BANNER;
const SLOT_BY_PLACEMENT = {
  cbt: import.meta.env.VITE_ADSENSE_SLOT_CBT,
  results: import.meta.env.VITE_ADSENSE_SLOT_RESULTS,
  dashboard: import.meta.env.VITE_ADSENSE_SLOT_DASHBOARD,
  practice: import.meta.env.VITE_ADSENSE_SLOT_PRACTICE,
};

let adsenseRequested = false;

function loadAdsenseScript() {
  if (adsenseRequested || !ADSENSE_CLIENT) return;
  adsenseRequested = true;
  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(script);
}

function isLive(sponsor, now) {
  if (sponsor.startsAt && now < new Date(sponsor.startsAt)) return false;
  if (sponsor.endsAt && now > new Date(`${sponsor.endsAt}T23:59:59`)) return false;
  return true;
}

function pickSponsor(placement) {
  const now = new Date();
  const eligible = SPONSORS.filter(
    (s) => isLive(s, now) && (!s.placements || s.placements.includes(placement))
  );
  if (!eligible.length) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

export default function AdSlot({ placement, className = "" }) {
  const { isPremium } = useAuth();
  const pushed = useRef(false);

  const sponsor = useMemo(() => pickSponsor(placement), [placement]);
  const slot = SLOT_BY_PLACEMENT[placement] || DEFAULT_SLOT;
  const hasAdsense = Boolean(ADSENSE_CLIENT && slot);
  const showAdsense = isPremium === false && !sponsor && hasAdsense;

  useEffect(() => {
    if (!showAdsense || pushed.current) return;
    pushed.current = true;
    loadAdsenseScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ad blockers or a failed script load must never break the page
    }
  }, [showAdsense]);

  if (isPremium !== false) return null;

  if (sponsor) {
    return (
      <div className={`w-full ${className}`}>
        <a
          href={sponsor.href}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="block h-[60px] md:h-[90px]"
        >
          <img
            src={sponsor.imageSrc}
            alt={sponsor.alt}
            loading="lazy"
            className="w-full h-full object-contain rounded-lg bg-surface-container-low"
          />
        </a>
        <p className="text-[10px] text-text-secondary text-right mt-1">Sponsored</p>
      </div>
    );
  }

  if (hasAdsense) {
    return (
      <div className={`w-full ${className}`}>
        <div className="h-[60px] md:h-[90px] overflow-hidden">
          <ins
            className="adsbygoogle"
            style={{ display: "block", height: "100%" }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slot}
            data-ad-format="horizontal"
            data-full-width-responsive="false"
          />
        </div>
        <p className="text-[10px] text-text-secondary text-right mt-1">Advertisement</p>
      </div>
    );
  }

  if (import.meta.env.DEV) {
    return (
      <div
        className={`w-full h-[60px] md:h-[90px] flex items-center justify-center rounded-lg border-2 border-dashed border-outline-variant text-[12px] text-text-secondary ${className}`}
      >
        Ad slot: {placement} (free users only)
      </div>
    );
  }

  return null;
}