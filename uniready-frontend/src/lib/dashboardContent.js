// Content and small pieces of client-side "personalization" logic for the
// Dashboard that need zero backend. Anything that DOES need a backend is
// marked with // BACKEND TODO so it's easy to find and wire up later.

// ---- Exam countdown -------------------------------------------------------
// BACKEND TODO: exam date(s) should eventually come from the backend/admin
// config (JAMB date changes yearly, and WAEC/NECO have separate dates).
export const EXAM_TARGET = {
  label: "JAMB 2026",
  date: new Date("2026-04-11T00:00:00"),
};

export function getDaysUntilExam(target = EXAM_TARGET.date, now = new Date()) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.ceil((target.getTime() - now.getTime()) / msPerDay);
  return diff;
}

// ---- Time-of-day greeting --------------------------------------------------
export function getTimeOfDayGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return "Still up?";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good evening";
}

// ---- Rotating study tips ---------------------------------------------------
// Static for now. BACKEND TODO: could eventually be curated/ranked server-side
// or tied to the user's actual weak areas.
export const STUDY_TIPS = [
  "Students who practice a little every day score higher than those who cram once a week.",
  "Reviewing your wrong answers teaches you more than getting a question right the first time.",
  "Break big topics into 15-minute sessions — it's easier to stay consistent that way.",
  "Past questions repeat patterns more than you'd think. Practice by year to spot them.",
  "Reading comprehension gets easier with timed practice — speed is a skill, not just knowledge.",
  "A short diagnostic now saves hours of studying the wrong things later.",
  "Sleep before an exam matters more than one extra hour of cramming.",
];

// Deterministic "pick of the day" so the tip doesn't change on every re-render
// but does change daily — no backend, no random flicker.
export function getTipOfTheDay(date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return STUDY_TIPS[dayIndex % STUDY_TIPS.length];
}

// ---- "Today's Focus" ------------------------------------------------------
// BACKEND TODO: once weakAreas has real data, Today's Focus should be picked
// from the user's actual weakest topic, not this static rotation.
export const FOCUS_ROTATION = [
  { subject: "maths", label: "Algebra Basics" },
  { subject: "english", label: "Comprehension Speed" },
  { subject: "maths", label: "Trigonometry" },
  { subject: "english", label: "Lexis & Structure" },
  { subject: "maths", label: "Word Problems" },
  { subject: "english", label: "Oral Forms" },
  { subject: "maths", label: "Statistics" },
];

export function getTodaysFocus(date = new Date(), weakAreas = []) {
  if (weakAreas.length > 0) {
    // Real weak-area data takes priority once it exists
    return { subject: weakAreas[0].subject, label: weakAreas[0].label };
  }
  const dayIndex = date.getDay(); // 0-6, stable per day
  return FOCUS_ROTATION[dayIndex % FOCUS_ROTATION.length];
}

// ---- Empty-state message variety ------------------------------------------
// Rotates so repeat visits with no data don't feel stale/broken.
export const EMPTY_WEAK_AREAS_MESSAGES = [
  "Complete a practice session or diagnostic and we'll flag topics to focus on here.",
  "No weak spots on record yet — take a quick quiz and we'll find them for you.",
  "This is where your trouble topics will show up once you've done some practice.",
];

export const EMPTY_CONTINUE_MESSAGES = [
  "A 10-minute mixed quiz that finds your weak spots and sets your readiness score — no prep needed.",
  "Not sure where to start? A quick diagnostic tells us exactly what to show you first.",
  "Take a short diagnostic and we'll build the rest of your dashboard around it.",
];

export function getRotatingMessage(list, date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return list[dayIndex % list.length];
}

// ---- Learning Hub reordering ------------------------------------------------
// BACKEND TODO: once we know the user's weakest subject, move the matching
// hub card first. For now this just deterministically nudges order using
// weakAreas if present, otherwise leaves default order.
export function getHubOrder(weakAreas, defaultOrder) {
  if (!weakAreas || weakAreas.length === 0) return defaultOrder;
  const weakSubject = weakAreas[0].subject;
  const matches = defaultOrder.filter((item) => item.subject === weakSubject);
  const rest = defaultOrder.filter((item) => item.subject !== weakSubject);
  return [...matches, ...rest];
}