import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Card from "../components/ui/Card";
import {
  EXAM_TARGET,
  getDaysUntilExam,
  getTimeOfDayGreeting,
  getTipOfTheDay,
  getTodaysFocus,
  EMPTY_WEAK_AREAS_MESSAGES,
  EMPTY_CONTINUE_MESSAGES,
  getRotatingMessage,
  getHubOrder,
} from "../lib/dashboardContent";

// Mock data shape — swap for real API/IndexedDB data later.
// A user with no continueItems and no weakAreas is treated as brand new,
// so every section below degrades gracefully instead of assuming history.
// BACKEND TODO: replace this whole object with a real user/session fetch.
const user = {
  name: "Chidi",
  readiness: null, // null until they've done a diagnostic or a few sessions
  streak: 0,
  streakDays: [], // e.g. ["Mon","Tue"] — days this week with activity

  // Anything the user left mid-way through — video lessons AND practice
  // sessions can both appear here at once, most recent first.
  continueItems: [
    // { type: "video", title: "Simultaneous Equations", subtitle: "Mathematics · Video Lesson", progressPercent: 40, resumeTo: "/lessons/simultaneous-equations" },
    // { type: "practice", title: "Comprehension Passage 4", subtitle: "English · 12 of 20 answered", progressPercent: 60, resumeTo: "/practice/exam" },
  ],

  weakAreas: [], // e.g. [{ label: "Trigonometry", subject: "maths" }]
  offlinePacks: [], // e.g. [{ label: "Maths & English 2024-2026", size: "245 MB" }]
};

const isNewUser = user.continueItems.length === 0 && user.weakAreas.length === 0;

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const CONTINUE_ICON = {
  video: "play_circle",
  practice: "edit_note",
};

// Default Learning Hub card order/config — reordered at render time by
// getHubOrder() based on the user's weakest subject once that data exists.
const HUB_ITEMS = [
  {
    id: "ai-predicted",
    subject: "mixed",
    icon: "auto_awesome",
    title: "AI Predicted Questions",
    body: "High-probability questions tailored for the 2024 exams based on past trends.",
    cta: "Start Session",
    to: "/practice",
  },
  {
    id: "cbt-simulator",
    subject: "mixed",
    icon: "computer",
    title: "JAMB CBT Simulator",
    body: "Experience the exact timing and interface of the real exam environment.",
    cta: "Take Mock Exam",
    to: "/practice/exam",
  },
  {
    id: "practice-topic",
    subject: "mixed",
    icon: "library_books",
    title: "Practice by Topic",
    body: "Target specific weak areas with categorized past questions and detailed explanations.",
    cta: "Browse Topics",
    to: "/practice",
  },
];

export default function Dashboard() {
  // A voucher code entered at signup that turned out invalid lands here
  // as a small non-blocking notice — signup itself already completed
  // normally, this is purely informational (see OtpVerify.jsx).
  const location = useLocation();
  const [voucherNoticeDismissed, setVoucherNoticeDismissed] = useState(false);
  const voucherError = location.state?.voucherError;

  // Computed once per mount — all pure client-side, no backend needed.
  const now = useMemo(() => new Date(), []);
  const timeGreeting = useMemo(() => getTimeOfDayGreeting(now), [now]);
  const daysUntilExam = useMemo(() => getDaysUntilExam(EXAM_TARGET.date, now), [now]);
  const tipOfTheDay = useMemo(() => getTipOfTheDay(now), [now]);
  const todaysFocus = useMemo(
    () => getTodaysFocus(now, user.weakAreas),
    [now]
  );
  const weakAreasEmptyMessage = useMemo(
    () => getRotatingMessage(EMPTY_WEAK_AREAS_MESSAGES, now),
    [now]
  );
  const continueEmptyMessage = useMemo(
    () => getRotatingMessage(EMPTY_CONTINUE_MESSAGES, now),
    [now]
  );
  const hubOrder = useMemo(() => getHubOrder(user.weakAreas, HUB_ITEMS), []);

  return (
    <>
      {voucherError && !voucherNoticeDismissed && (
        <div className="mb-stack-md flex items-center justify-between gap-2 bg-warning/10 text-warning rounded-lg px-4 py-2 text-[13px]">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            {voucherError}
          </span>
          <button
            onClick={() => setVoucherNoticeDismissed(true)}
            className="text-warning hover:opacity-70"
            aria-label="Dismiss"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Exam countdown strip */}
      <div className="mb-stack-md flex items-center gap-2 bg-tertiary-container/15 text-tertiary rounded-lg px-4 py-2 text-[14px] font-medium w-fit">
        <span className="material-symbols-outlined text-[18px]">event</span>
        {daysUntilExam > 0
          ? `${daysUntilExam} days until ${EXAM_TARGET.label}`
          : `${EXAM_TARGET.label} week is here`}
      </div>

      {/* Greeting + readiness stat */}
      <div className="mb-stack-lg flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-10 font-bold text-on-surface mb-2">
            {isNewUser
              ? `Welcome, ${user.name}! 👋`
              : `${timeGreeting}, ${user.name}! 👋`}
          </h1>
          <p className="text-text-secondary text-[18px] leading-7">
            {isNewUser ? "Let's get you set up for the 2024 JAMB." : "Let's dive back in."}
          </p>
        </div>

        {user.readiness !== null ? (
          <div className="flex items-center gap-3 bg-surface rounded-xl card-shadow px-4 py-3">
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-success/10 text-success font-bold text-[16px]">
              {user.readiness}%
            </div>
            <div>
              <p className="text-[14px] font-semibold text-on-surface leading-tight">
                Readiness Score
              </p>
              <p className="text-[12px] text-text-secondary leading-tight">
                Based on recent sessions
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant px-4 py-3">
            <span className="material-symbols-outlined text-text-secondary">
              query_stats
            </span>
            <div>
              <p className="text-[14px] font-semibold text-on-surface leading-tight">
                No readiness score yet
              </p>
              <p className="text-[12px] text-text-secondary leading-tight">
                Take a diagnostic to unlock this
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-stack-md">
        {/* Continue Learning — video lessons and practice sessions can both live here */}
        <div className="md:col-span-12">
          {user.continueItems.length > 0 ? (
            <>
              <h2 className="text-[18px] leading-6 font-semibold text-on-surface mb-stack-sm">
                Continue Learning
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
                {user.continueItems.map((item, i) => {
                  const isComplete = item.progressPercent >= 100;
                  return (
                    <Card
                      key={i}
                      as={Link}
                      to={item.resumeTo}
                      className="flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isComplete
                            ? "bg-success/10 text-success"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        <span className="material-symbols-outlined text-2xl">
                          {isComplete
                            ? "check_circle"
                            : CONTINUE_ICON[item.type] ?? "play_circle"}
                        </span>
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-semibold text-on-surface truncate">
                          {item.title}
                        </p>
                        <p
                          className={`text-[14px] truncate mb-2 ${
                            isComplete ? "text-success font-medium" : "text-text-secondary"
                          }`}
                        >
                          {isComplete ? "Completed! 🎉" : item.subtitle}
                        </p>
                        <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isComplete ? "bg-success" : "bg-primary"
                            }`}
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={`material-symbols-outlined flex-shrink-0 ${
                          isComplete ? "text-success" : "text-primary"
                        }`}
                      >
                        arrow_forward
                      </span>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <Card className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-primary-container text-on-primary-container w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-3xl">rocket_launch</span>
              </div>
              <div className="flex-grow">
                <h2 className="text-[20px] leading-7 font-semibold text-on-surface mb-1">
                  Start with a quick diagnostic
                </h2>
                <p className="text-text-secondary text-[14px]">{continueEmptyMessage}</p>
              </div>
              <Link
                to="/practice"
                className="btn-spring w-full md:w-auto flex-shrink-0 bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 px-6 hover:bg-primary-hover flex items-center justify-center gap-2"
              >
                Take Diagnostic
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </Card>
          )}
        </div>

        {/* Today's Focus — deterministic rotation until real weak-area data exists */}
        <Card
          as={Link}
          to={`/practice?subject=${todaysFocus.subject}&topic=${encodeURIComponent(
            todaysFocus.label
          )}`}
          className="md:col-span-12 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer bg-primary/5 border border-primary/20"
        >
          <div className="bg-primary text-on-primary w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">flag</span>
          </div>
          <div className="flex-grow">
            <p className="text-[12px] font-semibold text-primary uppercase tracking-wide">
              Today's Focus
            </p>
            <p className="font-semibold text-on-surface">{todaysFocus.label}</p>
          </div>
          <span className="material-symbols-outlined text-primary flex-shrink-0">
            arrow_forward
          </span>
        </Card>

        {/* Offline Packs */}
        <Card className="md:col-span-7 flex flex-col">
          <h2 className="text-[18px] leading-6 font-semibold text-on-surface mb-1">
            Offline Data Packs
          </h2>
          {user.offlinePacks.length > 0 ? (
            <>
              <p className="text-text-secondary text-[14px] mb-4">
                You have downloaded content for offline study.
              </p>
              {user.offlinePacks.map((pack) => (
                <div
                  key={pack.label}
                  className="bg-surface-container-low rounded-lg p-3 mb-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">
                      download_done
                    </span>
                    <div>
                      <p className="text-[14px] text-on-surface">{pack.label}</p>
                      <p className="text-[12px] text-text-secondary">
                        {pack.size} • Fully Available
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn-spring w-full md:w-auto mt-auto bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 px-6 hover:bg-primary-hover flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download More Subjects
              </button>
            </>
          ) : (
            <>
              <p className="text-text-secondary text-[14px] mb-4">
                Download a pack so you can practice with no data or bad network.
              </p>
              <div className="bg-surface-container-low rounded-lg p-4 mb-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-text-secondary">
                  cloud_download
                </span>
                <p className="text-[14px] text-text-secondary">Nothing downloaded yet</p>
              </div>
              <button className="btn-spring w-full md:w-auto mt-auto bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 px-6 hover:bg-primary-hover flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Your First Pack
              </button>
            </>
          )}
        </Card>

        {/* Streak */}
        <Card className="md:col-span-5 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[18px] leading-6 font-semibold text-on-surface">
              Study Streak
            </h2>
            <div className="flex items-center gap-1 text-tertiary">
              <span className="material-symbols-outlined text-[18px]">
                local_fire_department
              </span>
              <span className="text-[14px] font-bold">{user.streak} Days</span>
            </div>
          </div>
          <p className="text-text-secondary text-[14px] mb-4">
            {user.streak > 0
              ? "Keep it going — study a little every day."
              : "Complete a session today to start your streak."}
          </p>
          <div className="flex justify-between mt-auto">
            {WEEK_LABELS.map((label, i) => {
              const active = user.streakDays.includes(label + i);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] ${
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-low text-text-secondary"
                    }`}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Weak Areas */}
        <div className="md:col-span-12">
          <h2 className="text-[18px] leading-6 font-semibold text-on-surface mb-stack-sm">
            Weak Areas
          </h2>
          {user.weakAreas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.weakAreas.map((area) => (
                <Link
                  key={area.label}
                  to={`/practice?subject=${area.subject}&topic=${encodeURIComponent(
                    area.label
                  )}`}
                  className="btn-spring flex items-center gap-2 bg-error-container/40 text-on-error-container text-[14px] font-medium rounded-full pl-4 pr-3 py-2 hover:bg-error-container/60 transition-colors"
                >
                  {area.label}
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="flex items-center gap-4">
              <span className="material-symbols-outlined text-text-secondary text-2xl">
                target
              </span>
              <div>
                <p className="text-[14px] font-medium text-on-surface">
                  No weak areas identified yet
                </p>
                <p className="text-[12px] text-text-secondary">{weakAreasEmptyMessage}</p>
              </div>
            </Card>
          )}
        </div>

        {/* Study tip of the day */}
        <Card className="md:col-span-12 flex items-center gap-4 bg-surface-container-low border-none">
          <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0">
            lightbulb
          </span>
          <p className="text-[14px] text-text-secondary">
            <span className="font-semibold text-on-surface">Tip of the day: </span>
            {tipOfTheDay}
          </p>
        </Card>

        {/* Learning Hub — reordered based on weakest subject once that data exists */}
        <div className="md:col-span-12 mt-stack-md">
          <h2 className="text-[24px] leading-8 font-semibold text-on-surface mb-stack-sm">
            Learning Hub
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
            {hubOrder.map((item) => (
              <Card
                key={item.id}
                as={Link}
                to={item.to}
                className="hover:shadow-md transition-shadow cursor-pointer group flex flex-col"
              >
                <div className="bg-surface-container-high text-on-surface-variant w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-bold text-on-surface mb-2">{item.title}</h3>
                <p className="text-text-secondary mb-4 flex-grow">{item.body}</p>
                <span className="text-primary text-[14px] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform mt-auto">
                  {item.cta}
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </span>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}