// Fallback/demo data + derivation helpers for the Results page.
//
// CONTRACT: the Results page expects the CBT exam flow to navigate here via
// react-router state, e.g.:
//
//   navigate("/results", { state: sessionResultShape })
//
// See resultsContent.md (project root of this concern: ../../RESULTS.md)
// for the full documented shape. If no state is passed (e.g. visiting
// /results directly), DEMO_SESSION below is used instead so the page never
// breaks or shows an empty screen.

export const DEMO_SESSION = {
  subject: "Mathematics",
  year: 2023,
  topicFilter: null, // null = mixed/full year, otherwise a topic string
  timeSpentSeconds: 42 * 60 + 18,
  answers: [
    {
      id: "q1",
      topic: "Logarithms",
      prompt: "Evaluate log base 2/3 of 4/9 plus ln(1/e)",
      options: ["2", "-1", "1", "-2"],
      correctIndex: 1,
      selectedIndex: 1,
    },
    {
      id: "q2",
      topic: "Surds",
      prompt: "Express sqrt(1/125) + sqrt(1/5) in the form m*sqrt(x)",
      options: ["5/6 sqrt5", "6/25 sqrt5", "5/11 sqrt5", "6/5 sqrt5"],
      correctIndex: 3,
      selectedIndex: 0,
    },
    {
      id: "q3",
      topic: "Binary Operations",
      prompt: "An operation is defined... find the result",
      options: ["29/12", "17/12", "5/12", "1/2"],
      correctIndex: 2,
      selectedIndex: 2,
    },
    {
      id: "q4",
      topic: "Integration",
      prompt: "Integrate x/(x^2+1) dx",
      options: ["1/2 ln(x^2+1)+c", "ln(x^2+1)+c", "2ln(x^2+1)", "x/(x^3+1)+c"],
      correctIndex: 0,
      selectedIndex: 1,
    },
    {
      id: "q5",
      topic: "Statistics",
      prompt: "Pie chart question — how many pupils offer Additional Mathematics?",
      options: ["15", "10", "18", "12"],
      correctIndex: 0,
      selectedIndex: 0,
    },
    {
      id: "q6",
      topic: "Circle Geometry",
      prompt: "Find the value of angle COB",
      options: ["30°", "120°", "60°", "300°"],
      correctIndex: 1,
      selectedIndex: 2,
    },
    {
      id: "q7",
      topic: "Sets",
      prompt: "Venn diagram — symmetric difference",
      options: ["A", "B", "C", "D"],
      correctIndex: 0,
      selectedIndex: 0,
    },
    {
      id: "q8",
      topic: "Circle Geometry",
      prompt: "A second circle geometry question, different sub-topic angle",
      options: ["45°", "90°", "135°", "180°"],
      correctIndex: 1,
      selectedIndex: 2,
    },
  ],
};

export function summarize(session) {
  const total = session.answers.length;
  const correctCount = session.answers.filter(
    (a) => a.selectedIndex === a.correctIndex
  ).length;
  const incorrectCount = total - correctCount;
  const percent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  return { total, correctCount, incorrectCount, percent };
}

// Groups wrong answers by topic, sorted by error count descending, so the
// "AI Prescription" list highlights the topics that need the most review.
export function getWeakTopics(session, limit = 4) {
  const errorsByTopic = new Map();
  for (const a of session.answers) {
    if (a.selectedIndex === a.correctIndex) continue;
    errorsByTopic.set(a.topic, (errorsByTopic.get(a.topic) || 0) + 1);
  }
  return Array.from(errorsByTopic.entries())
    .map(([topic, errors]) => ({ topic, errors }))
    .sort((a, b) => b.errors - a.errors)
    .slice(0, limit);
}

export function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// Per-topic correct/incorrect counts + accuracy, sorted by accuracy
// ascending (weakest topic first) so charts naturally draw weak areas
// first. Deliberately takes a flat `answers` array rather than a whole
// session object, so it works the same whether `answers` comes from one
// session or from several merged together later (cross-session weak-area
// tracking needs persisted history — see RESULTS.md "Known limitations" —
// but this function doesn't care where the array came from).
export function getTopicBreakdown(answers) {
  const byTopic = new Map();
  for (const a of answers) {
    if (!byTopic.has(a.topic)) {
      byTopic.set(a.topic, { topic: a.topic, correct: 0, incorrect: 0 });
    }
    const entry = byTopic.get(a.topic);
    if (a.selectedIndex === a.correctIndex) entry.correct += 1;
    else entry.incorrect += 1;
  }
  return Array.from(byTopic.values())
    .map((t) => ({
      ...t,
      total: t.correct + t.incorrect,
      accuracy: Math.round((t.correct / (t.correct + t.incorrect)) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

// Accuracy -> color bucket, used by both the bar chart and heatmap so the
// two visualizations agree with each other at a glance.
export function accuracyColor(accuracy) {
  if (accuracy >= 80) return { bg: "bg-success", text: "text-success", soft: "bg-success/15" };
  if (accuracy >= 50) return { bg: "bg-warning", text: "text-warning", soft: "bg-warning/15" };
  return { bg: "bg-error", text: "text-error", soft: "bg-error/15" };
}

// Same idea as getTopicBreakdown, one level up: groups by `subject` instead
// of `topic`. Expects each answer to already be tagged with a `subject`
// field — see flattenAnswersWithSubject() in sessionHistory.js, which is
// what produces that shape from multiple stored sessions.
export function getSubjectBreakdown(answersWithSubject) {
  const bySubject = new Map();
  for (const a of answersWithSubject) {
    if (!bySubject.has(a.subject)) {
      bySubject.set(a.subject, { subject: a.subject, correct: 0, incorrect: 0 });
    }
    const entry = bySubject.get(a.subject);
    if (a.selectedIndex === a.correctIndex) entry.correct += 1;
    else entry.incorrect += 1;
  }
  return Array.from(bySubject.values())
    .map((s) => ({
      ...s,
      total: s.correct + s.incorrect,
      accuracy: Math.round((s.correct / (s.correct + s.incorrect)) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}