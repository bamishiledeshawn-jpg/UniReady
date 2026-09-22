import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MathText from "../components/practice/MathText";
import {
  getQuestionsFor,
  getSubject,
  DIAGRAM_COMPONENTS,
  VennDiagram,
  VENN_VARIANTS,
} from "../data/questionBank";

const EXAM_SECONDS = 40 * 60; // 40-minute timed practice session

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CbtExam() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const subjectId = searchParams.get("subject") || "mathematics";
  const year = Number(searchParams.get("year")) || 2023;
  const topicFilter = searchParams.get("topic") || null;

  const subject = getSubject(subjectId);
  const questions = useRef(getQuestionsFor(subjectId, year, topicFilter)).current;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const submittedRef = useRef(false);

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  // ---------------------------------------------------------------------
  // Build the sessionResult shape Results.jsx expects and navigate there.
  // Called either by the student hitting Submit on the last question, or
  // automatically when the timer runs out.
  // ---------------------------------------------------------------------
  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return; // guard against double-submit (timeout race)
    submittedRef.current = true;

    const timeSpentSeconds = EXAM_SECONDS - secondsLeft;
    const sessionResult = {
      subject: subject?.name ?? subjectId,
      year,
      topicFilter,
      timeSpentSeconds,
      answers: questions.map((q) => ({
        id: q.id,
        topic: q.topic,
        prompt: q.prompt,
        options: q.options ?? [],
        correctIndex: q.correctIndex,
        selectedIndex: answers[q.id] ?? -1,
      })),
    };

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    navigate("/results", { state: sessionResult });
  }, [answers, navigate, questions, secondsLeft, subject, subjectId, topicFilter, year]);

  // ---------------------------------------------------------------------
  // Timer — real countdown, auto-submits at zero rather than just
  // displaying a number that does nothing when it runs out.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  // ---------------------------------------------------------------------
  // Fullscreen lock. Honest limitation: the browser's own Escape key and
  // tab-close controls can always exit fullscreen / leave the page — no
  // website can override that, it's a browser security boundary, not
  // something specific to this implementation. What this DOES prevent is
  // casually clicking away within the app.
  // ---------------------------------------------------------------------
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // Fullscreen can be denied (e.g. iOS Safari doesn't support it at
        // all) — the exam still works, it just won't take over the whole
        // screen on unsupported browsers.
      });
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // ---------------------------------------------------------------------
  // Block the browser back button — intercept it and show the exit
  // confirmation instead of silently leaving mid-exam.
  // ---------------------------------------------------------------------
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      if (submittedRef.current) return;
      window.history.pushState(null, "", window.location.href);
      setShowExitConfirm(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Warn on tab close / refresh while the exam is still in progress.
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  if (!question) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-bright gap-4 text-text-secondary">
        <p>No questions found for this selection.</p>
        <button
          onClick={() => navigate("/practice")}
          className="text-primary font-medium"
        >
          Back to Practice
        </button>
      </div>
    );
  }

  const selectAnswer = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
  };

  const goNext = () => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const toggleFlag = () => {
    setFlagged((prev) => ({ ...prev, [question.id]: !prev[question.id] }));
  };

  const timeCritical = secondsLeft < 5 * 60;
  const DiagramComponent = question.diagram ? DIAGRAM_COMPONENTS[question.diagram] : null;
  const isVenn = question.diagram === "venn";

  return (
    <div className="min-h-screen flex flex-col bg-surface-bright">
      {/* Exam Header */}
      <header className="bg-inverse-surface flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 sticky top-0 z-50">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="btn-spring flex items-center gap-2 border border-error text-error px-4 py-2 rounded-lg text-[14px] font-medium hover:bg-error/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Exit Exam
        </button>

        <div className="flex flex-col items-center justify-center">
          <div
            className={`text-[24px] leading-8 font-semibold flex items-center gap-2 ${
              timeCritical ? "text-error animate-pulse" : "text-warning"
            }`}
          >
            <span className="material-symbols-outlined">timer</span>
            {formatTime(secondsLeft)}
          </div>
          <span className="text-[12px] tracking-wide font-semibold text-outline-variant">
            Remaining
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end text-on-tertiary">
            <span className="text-[14px] font-medium text-outline-variant">Question</span>
            <span className="text-[24px] leading-none font-semibold">
              {currentIndex + 1}{" "}
              <span className="text-outline-variant text-[16px]">/ {questions.length}</span>
            </span>
          </div>
          <div className="md:hidden flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-surface-container-highest">
            <span className="text-[14px] font-bold text-on-surface">
              {currentIndex + 1}/{questions.length}
            </span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-surface-container-highest flex-shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center py-stack-lg px-margin-mobile md:px-margin-desktop w-full max-w-[800px] mx-auto">
        <div className="w-full flex items-center justify-between mb-stack-md text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] uppercase tracking-wider font-semibold">
              {subject?.name ?? subjectId}
            </span>
            <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-[12px] font-semibold">
              {question.topic}
            </span>
          </div>
          <button
            onClick={toggleFlag}
            className={`flex items-center gap-1 text-[13px] font-medium transition-colors ${
              flagged[question.id] ? "text-warning" : "text-text-secondary hover:text-warning"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">flag</span>
            {flagged[question.id] ? "Flagged" : "Flag"}
          </button>
        </div>

        <article className="bg-surface w-full rounded-xl border border-surface-container-highest card-shadow p-stack-lg mb-stack-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary-fixed-dim" />

          <h2 className="text-[20px] md:text-[24px] leading-7 md:leading-8 font-bold mb-stack-lg text-on-surface">
            <MathText text={question.prompt} />
          </h2>

          {DiagramComponent && (
            <div className="mb-stack-lg">
              <DiagramComponent />
            </div>
          )}

          {isVenn ? (
            <div className="grid grid-cols-2 gap-4">
              {VENN_VARIANTS.map((variant, i) => {
                const isSelected = answers[question.id] === i;
                return (
                  <button
                    key={variant}
                    onClick={() => selectAnswer(i)}
                    className={`btn-spring flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors ${
                      isSelected
                        ? "border-primary-container bg-primary-container"
                        : "border-surface-container-highest hover:border-primary/50 hover:bg-surface-container-low"
                    }`}
                  >
                    <VennDiagram variant={variant} />
                    <span className="text-[12px] text-text-secondary">
                      {String.fromCharCode(65 + i)}.
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-stack-sm w-full">
              {question.options.map((option, i) => {
                const isSelected = answers[question.id] === i;
                return (
                  <label
                    key={i}
                    className={`flex items-center p-4 w-full border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-primary-container bg-primary-container text-on-primary-container scale-[0.98]"
                        : "border-surface-container-highest bg-surface hover:border-primary/50 hover:bg-surface-container-low"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => selectAnswer(i)}
                    />
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-medium mr-4 flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-white text-primary-container"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-[16px] md:text-[18px] leading-7 flex-grow">
                      <MathText text={option} />
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-on-primary-container">
                        check_circle
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </article>
      </main>

      {/* Footer Controls */}
      <footer className="bg-surface border-t border-surface-container-highest w-full py-stack-md px-margin-mobile md:px-margin-desktop sticky bottom-0 z-40">
        <div className="max-w-[800px] mx-auto flex gap-4 w-full">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="btn-spring flex items-center justify-center gap-2 border-2 border-surface-container-highest text-on-surface px-6 py-3 rounded-lg text-[14px] font-bold disabled:opacity-40 hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Previous
          </button>
          <button
            onClick={goNext}
            className="btn-spring flex-grow flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-lg text-[14px] font-bold hover:bg-primary-hover transition-all shadow-sm"
          >
            {isLast ? "Submit Exam" : "Next Question"}
            <span className="material-symbols-outlined">
              {isLast ? "check_circle" : "arrow_forward"}
            </span>
          </button>
        </div>
      </footer>

      {/* Exit confirmation — the only way out of the exam short of the
          browser's own Escape/tab-close, which no site can block. */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-margin-mobile">
          <div className="bg-surface rounded-xl p-6 max-w-sm w-full card-shadow">
            <h3 className="font-semibold text-on-surface mb-2">Exit this exam?</h3>
            <p className="text-text-secondary text-[14px] mb-6">
              Your progress on this attempt will be lost. The timer keeps running if you
              come back.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="text-[14px] font-medium rounded-lg py-2 px-4 text-on-surface hover:bg-surface-container-low"
              >
                Stay
              </button>
              <button
                onClick={() => {
                  submittedRef.current = true;
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  navigate("/practice");
                }}
                className="text-[14px] font-medium rounded-lg py-2 px-4 bg-error text-on-error hover:bg-error/90"
              >
                Exit Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
