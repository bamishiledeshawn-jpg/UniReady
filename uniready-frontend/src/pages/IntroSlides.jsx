import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Shown once, before a first-time visitor ever reaches login/signup — pure
// personality/brand intro, no functional data collected here (that's
// Onboarding.jsx, which runs AFTER signup instead). Marked as seen in
// localStorage so it doesn't reappear on every subsequent logged-out visit
// (e.g. after a user logs out later) — see handleDone.
const SLIDES = [
  {
    icon: "rocket_launch",
    title: "Prep smarter, not harder",
    body: "Practice questions, past papers, and video breakdowns — all built around JAMB, WAEC, and NECO.",
  },
  {
    icon: "target",
    title: "We find your weak spots",
    body: "A quick diagnostic shows exactly what to focus on, instead of guessing where to start.",
  },
  {
    icon: "bolt",
    title: "Study anywhere, even offline",
    body: "Download lessons and practice sets so a bad connection never slows you down.",
  },
];

const SEEN_INTRO_KEY = "uniready_seen_intro";

export default function IntroSlides() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const handleDone = () => {
    localStorage.setItem(SEEN_INTRO_KEY, "true");
    navigate("/login", { replace: true });
  };

  const handleNext = () => {
    if (isLast) {
      handleDone();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between px-6 py-10 max-w-md mx-auto">
      <button
        onClick={handleDone}
        className="self-end text-text-secondary text-[14px] font-medium"
      >
        Skip
      </button>

      <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
        <div className="bg-primary-container text-on-primary-container w-24 h-24 rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl">{slide.icon}</span>
        </div>
        <h1 className="text-[26px] leading-8 font-bold text-on-surface">
          {slide.title}
        </h1>
        <p className="text-text-secondary text-[16px] leading-6">{slide.body}</p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-2 bg-outline-variant"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="btn-spring w-full bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 px-6 hover:bg-primary-hover"
        >
          {isLast ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}

export { SEEN_INTRO_KEY };