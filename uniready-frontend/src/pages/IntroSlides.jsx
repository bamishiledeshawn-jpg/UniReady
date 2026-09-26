import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Shown once, before a first-time visitor reaches login/signup. Mixes pure
// personality/brand slides with two functional questions:
//   - exam choice (JAMB/WAEC/NECO) — actually needed for the dashboard
//   - two "flavor" questions — not saved anywhere yet, purely to make
//     setup feel tailored; wire these into real personalization later
//     if/when there's a use for them (e.g. surfacing different tips).
//
// Nothing here can be saved to the account yet because the user isn't
// logged in during this flow. Everything is stashed in localStorage and
// picked up by OtpVerify.jsx right after signup succeeds — see
// PENDING_EXAM_KEY usage there. This keeps the "pick your exam" question
// feeling like part of one flow instead of a second, separate screen
// after login (which is what made this feel tedious before).
const PENDING_EXAM_KEY = "uniready_pending_exam_type";
const SEEN_INTRO_KEY = "uniready_seen_intro";

const CHALLENGE_OPTIONS = [
  "Managing my time",
  "Weak fundamentals",
  "Exam anxiety",
  "Not sure where to start",
];

const STUDY_TIME_OPTIONS = ["Less than 2 hrs", "2–5 hrs", "5–10 hrs", "10+ hrs"];

const EXAM_OPTIONS = [
  { id: "JAMB", label: "JAMB" },
  { id: "WAEC", label: "WAEC" },
  { id: "NECO", label: "NECO" },
];

// Each slide is either informational (icon + copy) or a "choice" slide
// (a question with tappable options). Choice slides auto-advance once
// tapped, so the user doesn't need a separate "confirm" step.
const SLIDES = [
  {
    type: "info",
    icon: "rocket_launch",
    title: "Prep smarter, not harder",
    body: "Practice questions, past papers, and video breakdowns — all built around JAMB, WAEC, and NECO.",
  },
  {
    type: "choice",
    title: "What's your biggest challenge right now?",
    options: CHALLENGE_OPTIONS,
  },
  {
    type: "choice",
    title: "How much time can you study each week?",
    options: STUDY_TIME_OPTIONS,
  },
  {
    type: "choice",
    title: "Which exam are you preparing for?",
    options: EXAM_OPTIONS.map((e) => e.label),
    isExamQuestion: true,
  },
  {
    type: "info",
    icon: "target",
    title: "We find your weak spots",
    body: "A quick diagnostic shows exactly what to focus on, instead of guessing where to start.",
  },
  {
    type: "closing",
    icon: "bolt",
    title: "Let's see where you stand",
    body: "A short diagnostic — just a few questions — gives you a real starting point.",
  },
];

export default function IntroSlides() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    if (index < SLIDES.length - 1) setIndex((i) => i + 1);
  };

  const handleChoice = (optionLabel) => {
    if (slide.isExamQuestion) {
      const exam = EXAM_OPTIONS.find((e) => e.label === optionLabel);
      if (exam) localStorage.setItem(PENDING_EXAM_KEY, exam.id);
    }
    // Flavor answers (challenge / study time) aren't stored anywhere —
    // nothing downstream reads them yet. Revisit if that changes.
    goNext();
  };

  const handleSkip = () => {
    localStorage.setItem(SEEN_INTRO_KEY, "true");
    navigate("/login", { replace: true });
  };

  const handleStartDiagnostic = () => {
    localStorage.setItem(SEEN_INTRO_KEY, "true");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between px-6 py-10 max-w-md mx-auto">
      <button
        onClick={handleSkip}
        className="self-end text-text-secondary text-[14px] font-medium"
      >
        Skip
      </button>

      <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
        {slide.type !== "choice" && (
          <div className="bg-primary-container text-on-primary-container w-24 h-24 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl">{slide.icon}</span>
          </div>
        )}
        <h1 className="text-[26px] leading-8 font-bold text-on-surface">
          {slide.title}
        </h1>
        {slide.body && (
          <p className="text-text-secondary text-[16px] leading-6">{slide.body}</p>
        )}

        {slide.type === "choice" && (
          <div className="w-full flex flex-col gap-2 mt-2">
            {slide.options.map((option) => (
              <button
                key={option}
                onClick={() => handleChoice(option)}
                className="w-full text-left border border-outline-variant rounded-lg px-4 py-3 text-[15px] text-on-surface hover:bg-surface-container-low transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        )}
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

        {/* Choice slides advance on tap (see handleChoice) — no separate
            Next button for those, to keep it feeling conversational
            rather than form-like. Info/closing slides still need one. */}
        {slide.type !== "choice" && (
          <button
            onClick={isLast ? handleStartDiagnostic : goNext}
            className="btn-spring w-full bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 px-6 hover:bg-primary-hover"
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
}

export { SEEN_INTRO_KEY, PENDING_EXAM_KEY };