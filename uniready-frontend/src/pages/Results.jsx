import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DEMO_SESSION,
  summarize,
  getWeakTopics,
  getTopicBreakdown,
  getSubjectBreakdown,
  formatDuration,
} from "../lib/resultsContent";
import {
  saveSessionResult,
  getAllSessionResults,
  pruneExpiredSessions,
  flattenAnswersWithSubject,
} from "../lib/sessionHistory";
import { EXAM_TARGET } from "../lib/dashboardContent";
import { TopicBarChart, TopicHeatmap } from "../components/results/PerformanceCharts";

// Generic (non-topic-specific) remediation resources shown per weak topic.
// BACKEND TODO: swap for real video/article links once the content library
// exists; for now every topic gets the same two placeholder actions.
function RemediationActions({ topic }) {
  return (
    <div className="grid sm:grid-cols-2 gap-stack-sm">
      <button className="btn-spring flex items-center justify-between p-3 rounded-lg border border-surface-container-highest hover:bg-surface-container-low transition-colors group text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined">play_circle</span>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-on-surface">
              Watch Video
            </div>
            <div className="text-[12px] text-text-secondary">{topic}</div>
          </div>
        </div>
        <span
          className="material-symbols-outlined text-[18px] text-text-secondary hover:text-primary transition-colors"
          title="Toggle Quality"
        >
          hd
        </span>
      </button>
      <button className="btn-spring flex items-center gap-3 p-3 rounded-lg border border-surface-container-highest hover:bg-surface-container-low transition-colors group text-left">
        <div className="w-10 h-10 rounded bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined">article</span>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-on-surface">
            Read Breakdown
          </div>
          <div className="text-[12px] text-text-secondary">
            Text &amp; Images • 0 MB
          </div>
        </div>
      </button>
    </div>
  );
}

function QuestionReviewRow({ answer, index }) {
  const [open, setOpen] = useState(false);
  const isCorrect = answer.selectedIndex === answer.correctIndex;

  return (
    <div className="border border-surface-container-highest rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-surface-container-low transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 ${
              isCorrect
                ? "bg-success/10 text-success"
                : "bg-error/10 text-error"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isCorrect ? "check" : "close"}
            </span>
          </span>
          <span className="text-[14px] text-on-surface truncate">
            <span className="font-semibold mr-1">{index + 1}.</span>
            {answer.prompt}
          </span>
        </div>
        <span className="material-symbols-outlined text-text-secondary flex-shrink-0">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <span className="text-[12px] text-text-secondary uppercase tracking-wide">
            {answer.topic}
          </span>
          {answer.options.map((option, i) => {
            const isSelected = i === answer.selectedIndex;
            const isRight = i === answer.correctIndex;
            return (
              <div
                key={i}
                className={`text-[14px] rounded-md px-3 py-2 border flex items-center justify-between ${
                  isRight
                    ? "border-success/40 bg-success/5 text-on-surface"
                    : isSelected
                      ? "border-error/40 bg-error/5 text-on-surface"
                      : "border-surface-container-highest text-text-secondary"
                }`}
              >
                <span>
                  {String.fromCharCode(65 + i)}. {option}
                </span>
                {isRight && (
                  <span className="text-[12px] font-semibold text-success">
                    Correct
                  </span>
                )}
                {isSelected && !isRight && (
                  <span className="text-[12px] font-semibold text-error">
                    Your answer
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Results() {
  const location = useLocation();
  const [reviewOpen, setReviewOpen] = useState(false);

  // Real sessions come in via navigate("/results", { state }) from the exam
  // flow. Falls back to demo data so this page never renders empty/broken
  // when visited directly (e.g. during development).
  const session = location.state ?? DEMO_SESSION;
  const isDemo = !location.state;

  // Persist real (non-demo) sessions to IndexedDB on arrival, then load the
  // full history for the cross-session "Weak Subjects" view. Demo sessions
  // are never saved — only real completed exams count toward history.
  const [history, setHistory] = useState([]);
  useEffect(() => {
    let cancelled = false;

    async function run() {
      await pruneExpiredSessions();
      if (location.state) {
        await saveSessionResult(location.state, EXAM_TARGET);
      }
      const all = await getAllSessionResults();
      if (!cancelled) setHistory(all);
    }

    run();
    return () => {
      cancelled = true;
    };
    // Only re-run if a genuinely new session arrives via navigation state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const subjectBreakdown = useMemo(
    () => getSubjectBreakdown(flattenAnswersWithSubject(history)),
    [history]
  );
  const showWeakSubjects = history.length > 1;

  const { total, correctCount, incorrectCount, percent } = useMemo(
    () => summarize(session),
    [session]
  );
  const weakTopics = useMemo(() => getWeakTopics(session), [session]);
  const topicBreakdown = useMemo(
    () => getTopicBreakdown(session.answers),
    [session]
  );

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const scopeLabel = [session.subject, session.year, session.topicFilter]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-stack-lg">
      {isDemo && (
        <div className="text-[12px] text-text-secondary bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2">
          Showing demo results — no session data was passed to this page.
        </div>
      )}

      {/* Header */}
      <header className="text-center flex flex-col items-center gap-stack-sm pt-stack-lg">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-2">
          <span
            className="material-symbols-outlined text-[32px] text-success"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            task_alt
          </span>
        </div>
        <h1 className="text-[40px] leading-[48px] font-bold text-primary">
          Session Complete!
        </h1>
        {scopeLabel && (
          <span className="text-[12px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wide">
            {scopeLabel}
          </span>
        )}
        <p className="text-[18px] leading-7 text-on-surface-variant max-w-2xl">
          Great effort. Here is your performance summary and your personalized AI
          remediation plan to strengthen weak areas.
        </p>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Score Summary */}
        <section className="md:col-span-4 flex flex-col gap-stack-md">
          <div className="bg-surface rounded-xl border border-surface-container-highest p-gutter card-shadow h-full flex flex-col">
            <h2 className="text-[24px] leading-8 font-semibold text-on-surface mb-stack-md">
              Your Score
            </h2>
            <div className="flex-1 flex flex-col items-center justify-center py-stack-md">
              <div className="relative flex items-center justify-center w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-surface-container-highest"
                    cx="50"
                    cy="50"
                    fill="none"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                  />
                  <circle
                    className="text-success"
                    cx="50"
                    cy="50"
                    fill="none"
                    r={radius}
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[40px] leading-[48px] font-bold text-primary">
                    {correctCount}
                  </span>
                  <span className="text-[12px] text-text-secondary uppercase tracking-widest">
                    of {total}
                  </span>
                </div>
              </div>
              {typeof session.timeSpentSeconds === "number" && (
                <span className="text-[12px] text-text-secondary mt-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  Time spent: {formatDuration(session.timeSpentSeconds)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-stack-md mt-stack-md pt-stack-md border-t border-surface-container-highest">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-[14px] font-medium text-text-secondary">
                    Correct
                  </span>
                </div>
                <span className="text-[24px] leading-8 font-bold text-success pl-5">
                  {correctCount}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-error" />
                  <span className="text-[14px] font-medium text-text-secondary">
                    Incorrect
                  </span>
                </div>
                <span className="text-[24px] leading-8 font-bold text-error pl-5">
                  {incorrectCount}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* AI Prescription */}
        <section className="md:col-span-8 flex flex-col gap-stack-md">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
            <h2 className="text-[24px] leading-8 font-semibold text-on-surface">
              AI Prescription
            </h2>
          </div>

          {weakTopics.length === 0 ? (
            <p className="text-text-secondary bg-surface-container-low border border-surface-container-highest rounded-lg p-4">
              No weak topics detected — every question was answered correctly.
            </p>
          ) : (
            <>
              <p className="text-text-secondary mb-stack-sm">
                Based on your incorrect answers, we recommend reviewing these
                specific topics.
              </p>
              <div className="flex flex-col gap-stack-md">
                {weakTopics.map((item) => (
                  <div
                    key={item.topic}
                    className="bg-surface rounded-xl border border-surface-container-highest p-gutter card-shadow hover:border-primary/30 hover:ring-2 hover:ring-primary/10 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-stack-md">
                      <div>
                        <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-[12px] font-semibold mb-2">
                          {session.subject}
                        </div>
                        <h3 className="text-[20px] leading-tight font-semibold text-on-surface">
                          {item.topic}
                        </h3>
                      </div>
                      <span className="text-[12px] font-semibold text-error bg-error/10 px-2 py-1 rounded">
                        {item.errors} {item.errors === 1 ? "error" : "errors"}
                      </span>
                    </div>
                    <RemediationActions topic={item.topic} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <section className="bg-surface rounded-xl border border-surface-container-highest p-gutter card-shadow flex flex-col gap-stack-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            <h2 className="text-[18px] font-semibold text-on-surface">
              Answers by Topic
            </h2>
          </div>
          {topicBreakdown.length === 0 ? (
            <p className="text-text-secondary text-[14px]">No data to chart yet.</p>
          ) : (
            <TopicBarChart data={topicBreakdown} />
          )}
        </section>

        <section className="bg-surface rounded-xl border border-surface-container-highest p-gutter card-shadow flex flex-col gap-stack-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">grid_view</span>
            <h2 className="text-[18px] font-semibold text-on-surface">
              Topic Mastery Heatmap
            </h2>
          </div>
          {topicBreakdown.length === 0 ? (
            <p className="text-text-secondary text-[14px]">No data to chart yet.</p>
          ) : (
            <TopicHeatmap data={topicBreakdown} />
          )}
        </section>
      </div>

      {/* Weak Subjects — only shown once there's more than one stored
          session this prep season, since a single session has nothing
          cross-subject to compare against. */}
      {showWeakSubjects && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <section className="bg-surface rounded-xl border border-surface-container-highest p-gutter card-shadow flex flex-col gap-stack-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">insights</span>
              <h2 className="text-[18px] font-semibold text-on-surface">
                Answers by Subject{" "}
                <span className="text-[12px] font-normal text-text-secondary">
                  ({EXAM_TARGET.label} so far)
                </span>
              </h2>
            </div>
            <TopicBarChart data={subjectBreakdown} labelKey="subject" />
          </section>

          <section className="bg-surface rounded-xl border border-surface-container-highest p-gutter card-shadow flex flex-col gap-stack-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">apps</span>
              <h2 className="text-[18px] font-semibold text-on-surface">
                Weak Subjects
              </h2>
            </div>
            <TopicHeatmap data={subjectBreakdown} labelKey="subject" />
          </section>
        </div>
      )}

      {/* Question Review */}
      <section className="flex flex-col gap-stack-md">
        <button
          onClick={() => setReviewOpen((o) => !o)}
          className="flex items-center justify-between bg-surface rounded-xl border border-surface-container-highest p-gutter card-shadow hover:border-primary/30 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">fact_check</span>
            <span className="text-[18px] font-semibold text-on-surface">
              Review All Questions
            </span>
            <span className="text-[12px] text-text-secondary">
              ({total} questions)
            </span>
          </div>
          <span className="material-symbols-outlined text-text-secondary">
            {reviewOpen ? "expand_less" : "expand_more"}
          </span>
        </button>

        {reviewOpen && (
          <div className="flex flex-col gap-2">
            {session.answers.map((answer, i) => (
              <QuestionReviewRow key={answer.id ?? i} answer={answer} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Footer actions */}
      <footer className="mt-auto pt-stack-lg pb-stack-md flex flex-col-reverse sm:flex-row items-center justify-end gap-stack-md border-t border-surface-container-highest">
        <Link
          to="/practice"
          className="btn-spring w-full sm:w-auto px-6 py-3 min-h-[48px] rounded-lg text-[14px] font-medium text-on-surface bg-surface-container-high hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          Practice Again
        </Link>
        <Link
          to="/"
          className="btn-spring w-full sm:w-auto px-8 py-3 min-h-[48px] rounded-lg text-[14px] font-medium text-on-primary bg-primary hover:bg-primary-hover shadow-sm transition-all flex items-center justify-center gap-2"
        >
          Back to Dashboard
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
      </footer>
    </div>
  );
}