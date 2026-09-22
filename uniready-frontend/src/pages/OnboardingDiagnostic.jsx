import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import { SUBJECTS, getQuestionsFor } from "../data/questionBank";

// Explicitly a placeholder diagnostic — the question bank is mostly
// generated filler right now (only Math 2023 is real content), so this
// quiz is standing in for a real one until transcription catches up.
// It still produces a genuine score from genuine (if generic) questions,
// which is enough to give the dashboard something real to show.
const QUIZ_LENGTH = 8;

function buildQuiz() {
  const pool = [];
  for (const subject of SUBJECTS) {
    const qs = getQuestionsFor(subject.id, 2024);
    if (qs?.length) pool.push(...qs.slice(0, 2));
  }
  // Shuffle, then take the first QUIZ_LENGTH.
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, QUIZ_LENGTH);
}

export default function OnboardingDiagnostic() {
  const navigate = useNavigate();
  const [questions] = useState(buildQuiz);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState(null);

  const current = questions[index];
  const isLast = index === questions.length - 1;

  const handleAnswer = (optionIndex) => {
    if (selected !== null) return; // already answered this one
    setSelected(optionIndex);
    if (optionIndex === current.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      // correctCount is already up to date here — handleAnswer() ran on
      // a separate click before this one, so its setState has landed.
      const score = Math.round((correctCount / questions.length) * 100);
      navigate("/", { state: { readinessScore: score } });
      return;
    }
    setSelected(null);
    setIndex((i) => i + 1);
  };

  if (!questions.length) {
    // No generated questions available for some reason — don't block
    // onboarding on it, just skip straight to the dashboard.
    navigate("/");
    return null;
  }

  return (
    <div className="max-w-lg mx-auto pt-8 px-4">
      <p className="text-text-secondary text-[14px] mb-4 text-center">
        Quick diagnostic · Question {index + 1} of {questions.length}
      </p>

      <Card className="mb-6">
        <p className="font-semibold text-on-surface text-[18px] mb-4">
          {current.prompt}
        </p>
        <div className="flex flex-col gap-2">
          {current.options.map((option, i) => {
            const isSelected = selected === i;
            const isCorrectOption = i === current.correctIndex;
            let stateClasses = "border border-outline-variant hover:bg-surface-container-low";
            if (selected !== null) {
              if (isCorrectOption) {
                stateClasses = "border border-success bg-success/10 text-success";
              } else if (isSelected) {
                stateClasses = "border border-error bg-error/10 text-error";
              }
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
                className={`text-left rounded-lg px-4 py-3 text-[15px] transition-colors ${stateClasses}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </Card>

      {selected !== null && (
        <button
          onClick={handleNext}
          className="btn-spring w-full bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 px-6 hover:bg-primary-hover flex items-center justify-center gap-2"
        >
          {isLast ? "See my readiness score" : "Next question"}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      )}
    </div>
  );
}