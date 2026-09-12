# Practice System — Build Summary

What changed in this pass: the Practice section went from "one showcase page
with 7 demo questions" to a real subject → year → topic structure, wired
into a functional timed exam flow that hands off to the existing Results
page contract.

## New structure

```
/practice                    → hub: topic search + 8 subject cards
/practice/:subjectId         → year grid + topic filter chips, then Start
/practice/exam?subject=&year=&topic=  → the timed CBT exam itself
```

The 8 subjects: English Language, Mathematics, Biology, Chemistry, Physics,
Economics, Government, Agric Science. Each has 10 years (2015–2024) and a
per-subject topic list (6–8 topics each) used for both the topic filter
chips and the global search bar.

## Question data — `src/data/questionBank.jsx`

Note the `.jsx` extension, not `.js` — it has to be, because this file
contains actual SVG diagram components (see below), and Vite's build will
fail on JSX syntax inside a plain `.js` file.

**Real content:** 7 questions, Mathematics → 2023, transcribed from printed
JAMB photos — logs, surds, an integral, a custom binary operator, a pie
chart (statistics + algebra), circle geometry, and a Venn diagram. These are
the only real exam content in the app right now.

**Everything else is generated filler**, not stored. `getQuestionsFor(subjectId, year, topicFilter)`
is the single entry point the UI calls — for Mathematics 2023 it splices the
7 real questions in first, then fills the remaining slots (to reach 40) with
generated placeholders; every other subject/year combination is 40 generated
placeholders. Nothing is pre-computed or written to a giant array — it's
built on demand when a student picks a subject and year, so the file stays
small despite covering 8 × 10 × 40 = 3,200 possible question slots.

**Filler questions are structurally real** (real subject, real year, real
topic tag, real 4-option shape) but the prompt text is a placeholder
("Sample Mathematics question 12 on Algebra (2019)") and is flagged with
`isFiller: true`. This is intentional — the whole point was proving the
subject/year/topic/search structure works, not writing 3,200 fake exam
questions by hand.

**Diagrams** (`CircleAngleDiagram`, `PieChartDiagram`, `VennDiagram`) live in
this same file rather than separate files, per an earlier decision to keep
file count down — they're inline SVG, no external image assets.

## Search bar

`searchTopics(query)` in `questionBank.jsx` scans each subject's topic list
(not every question — there's no reason to scan 3,200 questions to answer
"which subjects have a topic called Federalism"). Matching a topic in the
Practice hub's search bar jumps straight to
`/practice/:subjectId?topic=<topic>`, which pre-selects that topic filter on
the subject page.

## Exam flow (`src/pages/CbtExam.jsx`)

Kept the visual design from the version already in the project (header with
exit/timer/question-counter, card-based question display, flag button,
footer nav) but made it fully data-driven:

- **Timer is real** — 40-minute countdown, ticks every second, and **auto-submits**
  when it hits zero instead of just displaying a number that does nothing.
- **Fullscreen** — requests fullscreen via the browser's Fullscreen API on
  entering the exam, exits it on submit or exit-confirm.
- **Navigation blocking** — the in-app Exit button opens a confirmation
  modal instead of leaving directly; the browser back button is intercepted
  (via a `popstate` listener) and also routed through that same
  confirmation instead of silently navigating away; closing the tab
  mid-exam triggers the browser's native "are you sure" prompt via
  `beforeunload`.
- **Honest limitation, worth remembering:** none of this can block the
  browser's own Escape key exiting fullscreen, or force-closing the tab
  entirely. No website can override those — it's a browser security
  boundary, not a gap in this implementation. "Can't leave until done" is
  true for anything happening inside the app; it was never going to be
  literally true against the browser itself.
- **Math/diagram rendering** — every question renders through the same
  `MathText` component and diagram set used everywhere else in the app, so
  a filler question and a real transcribed question render identically.
- **Venn diagram questions** render their 4 answer options as the actual
  SVG diagrams (not text), matching how question 22 works in the source
  material — selecting one behaves the same as a normal text option.

## Handoff to Results

On submit (button press or timer hitting zero), `CbtExam.jsx` builds exactly
the shape `Results.jsx` already expects (confirmed by reading
`resultsContent.js` and `Results.jsx` in the current project — this wasn't
guessed):

```js
navigate("/results", {
  state: {
    subject: "Mathematics",       // subject NAME, not id
    year: 2023,
    topicFilter: null,            // or a topic string
    timeSpentSeconds: 1234,
    answers: [
      { id, topic, prompt, options, correctIndex, selectedIndex },
      // one entry per question, in order, selectedIndex is -1 if unanswered
    ],
  },
});
```

This means the existing Results page, `sessionHistory.js` IndexedDB
persistence, and the weak-topic/subject breakdown charts all work
unmodified against real (well — real-shaped) exam attempts now, not just
the `DEMO_SESSION` fallback.

## What's NOT done / next steps

- **Only Mathematics 2023 has real content.** The other 79 subject/year
  combinations are 100% generated filler. Populating real questions for
  other subjects is a content task, not a code task — the structure already
  supports it, just add entries to (or replace) `REAL_MATH_2023_QUESTIONS`-style
  arrays per subject/year as real transcribed questions come in.
- **No backend wiring.** Same as before — this is all still frontend-only,
  running against generated/local data. `uniready-api` has no question-bank
  endpoints yet.
- **`ComplexQuestionShowcase.jsx` is now unused** — its 7 questions and
  diagram logic were absorbed into `questionBank.jsx` and the real exam
  flow. Safe to delete that file; nothing imports it anymore.
- **Old `Practice.jsx`'s "Start Mock Exam" button** (which linked straight
  to `/practice/exam` with no subject/year selected) is gone, replaced by
  the subject → year → topic flow. Any old bookmarks/links to that flow
  will need a subject/year in the URL now, or they'll fall back to the
  defaults (Mathematics, 2023) baked into `CbtExam.jsx`.
