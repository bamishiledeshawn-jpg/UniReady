// ---------------------------------------------------------------------------
// SUBJECTS, YEARS, TOPICS
// ---------------------------------------------------------------------------
export const YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

export const SUBJECTS = [
  { id: "english", name: "English Language", icon: "menu_book", topics: ["Comprehension", "Lexis & Structure", "Oral Forms", "Cloze Test", "Summary", "Grammar"] },
  { id: "mathematics", name: "Mathematics", icon: "calculate", topics: ["Algebra", "Logarithms & Surds", "Geometry", "Trigonometry", "Statistics", "Calculus", "Sets", "Number Bases"] },
  { id: "biology", name: "Biology", icon: "eco", topics: ["Cell Biology", "Genetics", "Ecology", "Reproduction", "Evolution", "Nutrition"] },
  { id: "chemistry", name: "Chemistry", icon: "science", topics: ["Atomic Structure", "Chemical Bonding", "Acids & Bases", "Organic Chemistry", "Electrochemistry", "Gas Laws"] },
  { id: "physics", name: "Physics", icon: "bolt", topics: ["Mechanics", "Electricity", "Waves", "Thermodynamics", "Optics", "Modern Physics"] },
  { id: "economics", name: "Economics", icon: "trending_up", topics: ["Demand & Supply", "National Income", "Money & Banking", "International Trade", "Public Finance"] },
  { id: "government", name: "Government", icon: "gavel", topics: ["Constitution", "Political Parties", "Federalism", "International Relations", "Local Government"] },
  { id: "agric", name: "Agric Science", icon: "agriculture", topics: ["Soil Science", "Crop Production", "Animal Husbandry", "Farm Management", "Agric Economics"] },
];

export function getSubject(subjectId) {
  return SUBJECTS.find((s) => s.id === subjectId);
}

// ---------------------------------------------------------------------------
// REAL QUESTIONS — transcribed from printed JAMB 2023 Mathematics photos.
// Everything else in the bank is generated filler (see below). This is the
// only place actual content lives right now.
// ---------------------------------------------------------------------------
export const REAL_MATH_2023_QUESTIONS = [
  {
    id: "math-2023-real-1",
    subject: "mathematics",
    year: 2023,
    topic: "Logarithms & Surds",
    prompt: "Evaluate $\\log_{2/3}\\left(\\dfrac{4}{9}\\right) + \\log_e\\left(\\dfrac{1}{e}\\right)$",
    options: ["$2$", "$-1$", "$1$", "$-2$"],
    correctIndex: 1,
  },
  {
    id: "math-2023-real-2",
    subject: "mathematics",
    year: 2023,
    topic: "Logarithms & Surds",
    prompt: "Express $\\sqrt{\\dfrac{1}{125}} + \\sqrt{\\dfrac{1}{5}}$ in the form $m\\sqrt{x}$",
    options: ["$\\dfrac{5}{6}\\sqrt{5}$", "$\\dfrac{6}{25}\\sqrt{5}$", "$\\dfrac{5}{11}\\sqrt{5}$", "$\\dfrac{6}{5}\\sqrt{5}$"],
    correctIndex: 3,
  },
  {
    id: "math-2023-real-3",
    subject: "mathematics",
    year: 2023,
    topic: "Sets",
    prompt:
      "An operation $\\otimes$ is defined on the set of real numbers $\\mathbb{R}$ such that if $x, y \\in \\mathbb{R}$, then $x \\otimes y = \\dfrac{x+y}{2}$. Find $\\left(\\dfrac{1}{2} \\otimes \\dfrac{1}{3}\\right) \\otimes 1$",
    options: ["$\\dfrac{29}{12}$", "$\\dfrac{17}{12}$", "$\\dfrac{5}{12}$", "$\\dfrac{1}{2}$"],
    correctIndex: 2,
  },
  {
    id: "math-2023-real-4",
    subject: "mathematics",
    year: 2023,
    topic: "Calculus",
    prompt: "Integrate $\\displaystyle\\int \\dfrac{x}{x^2+1}\\,dx$",
    options: ["$\\dfrac{1}{2}\\ln(x^2+1)+c$", "$\\ln(x^2+1)+c$", "$2\\ln(x^2+1)$", "$\\dfrac{x}{x^3+1}+c$"],
    correctIndex: 0,
  },
  {
    id: "math-2023-real-5",
    subject: "mathematics",
    year: 2023,
    topic: "Statistics",
    prompt:
      "In a class of 60 pupils, subjects are distributed on a pie chart with sectors: Additional Mathematics $(3x+24)°$, Biology $(3x+18)°$, Geography $x°$, Geography $(x+2)°$, and Geography $(2x+12)°$. How many pupils offer Additional Mathematics?",
    options: ["$15$", "$10$", "$18$", "$12$"],
    correctIndex: 0,
    diagram: "pieChart",
  },
  {
    id: "math-2023-real-6",
    subject: "mathematics",
    year: 2023,
    topic: "Geometry",
    prompt: "Find the value of $\\angle COB$ if $O$ is the centre of the circle, given $\\angle OBA = \\angle OCA = 20°$.",
    options: ["$30°$", "$120°$", "$60°$", "$300°$"],
    correctIndex: 1,
    diagram: "circleAngle",
  },
  {
    id: "math-2023-real-7",
    subject: "mathematics",
    year: 2023,
    topic: "Sets",
    prompt: "Which of the following represents $(A \\cup B) \\cap (A \\cap B)^c$ on a Venn diagram?",
    diagram: "venn",
    correctIndex: 0,
  },
];

// ---------------------------------------------------------------------------
// FILLER QUESTION GENERATION
// Structurally correct placeholders — real prompt shape, real topic tags,
// real subject/year — but not real exam content. Generated on demand per
// subject+year rather than stored, so this file stays small no matter how
// many subject/year combinations exist (8 × 10 × 40 = 3,200 possible
// questions, none of them pre-computed).
// ---------------------------------------------------------------------------
function generateFillerQuestions(subject, year, count) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const topic = subject.topics[i % subject.topics.length];
    const correctIndex = i % 4;
    questions.push({
      id: `${subject.id}-${year}-filler-${i}`,
      subject: subject.id,
      year,
      topic,
      prompt: `Sample ${subject.name} question ${i + 1} on ${topic} (${year})`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctIndex,
      isFiller: true,
    });
  }
  return questions;
}

const QUESTIONS_PER_YEAR = 40;

// getQuestionsFor is the single entry point the UI uses to pull a question
// set. Real content (currently only Mathematics 2023) is spliced in ahead
// of filler so it's what students actually see first.
export function getQuestionsFor(subjectId, year, topicFilter = null) {
  const subject = getSubject(subjectId);
  if (!subject) return [];

  let questions;
  if (subjectId === "mathematics" && year === 2023) {
    const fillerCount = QUESTIONS_PER_YEAR - REAL_MATH_2023_QUESTIONS.length;
    questions = [...REAL_MATH_2023_QUESTIONS, ...generateFillerQuestions(subject, year, fillerCount)];
  } else {
    questions = generateFillerQuestions(subject, year, QUESTIONS_PER_YEAR);
  }

  if (topicFilter) {
    questions = questions.filter((q) => q.topic === topicFilter);
  }

  return questions;
}

// ---------------------------------------------------------------------------
// TOPIC SEARCH — scans the topic lists (not every question) since that's
// what the search bar actually needs: "find me where this topic lives."
// ---------------------------------------------------------------------------
export function searchTopics(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results = [];
  for (const subject of SUBJECTS) {
    for (const topic of subject.topics) {
      if (topic.toLowerCase().includes(q)) {
        results.push({ subjectId: subject.id, subjectName: subject.name, topic });
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// DIAGRAMS — inline SVG for the handful of questions that are inherently
// visual (geometry, charts, Venn diagrams) rather than pure notation.
// ---------------------------------------------------------------------------
export function CircleAngleDiagram() {
  return (
    <svg viewBox="0 0 240 220" className="w-full max-w-[220px] mx-auto">
      <circle cx="120" cy="110" r="90" fill="none" stroke="currentColor" strokeWidth="2" className="text-outline" />
      <g stroke="currentColor" strokeWidth="1.5" className="text-on-surface">
        <line x1="38" y1="145" x2="120" y2="110" />
        <line x1="38" y1="145" x2="120" y2="35" />
        <line x1="120" y1="110" x2="120" y2="35" />
        <line x1="120" y1="110" x2="188" y2="150" />
        <line x1="38" y1="145" x2="188" y2="150" />
      </g>
      <circle cx="120" cy="110" r="2.5" fill="currentColor" />
      <text x="128" y="108" fontSize="14" className="fill-on-surface">O</text>
      <text x="18" y="150" fontSize="14" className="fill-on-surface">A</text>
      <text x="112" y="26" fontSize="14" className="fill-on-surface">B</text>
      <text x="192" y="158" fontSize="14" className="fill-on-surface">C</text>
      <text x="100" y="70" fontSize="12" className="fill-primary">20°</text>
      <text x="150" y="140" fontSize="12" className="fill-primary">20°</text>
    </svg>
  );
}

export function PieChartDiagram() {
  const sectors = [
    { lines: ["Additional", "Mathematics", "(3x+24)°"], start: -90, end: -18, color: "var(--color-primary)" },
    { lines: ["Biology", "(3x+18)°"], start: -18, end: 60, color: "var(--color-secondary)" },
    { lines: ["Geography", "(2x+12)°"], start: 60, end: 130, color: "var(--color-tertiary)" },
    { lines: ["Geography", "(x+2)°"], start: 130, end: 195, color: "var(--color-warning)" },
    { lines: ["Geography", "x°"], start: 195, end: 270, color: "var(--color-error)" },
  ];
  const cx = 130, cy = 130, r = 105;
  const toXY = (deg, radius = r) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };
  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-[240px] mx-auto">
      {sectors.map((s, i) => {
        const p1 = toXY(s.start);
        const p2 = toXY(s.end);
        const largeArc = s.end - s.start > 180 ? 1 : 0;
        const labelRadius = s.lines.length > 2 ? r * 0.68 : r * 0.6;
        const mid = toXY((s.start + s.end) / 2, labelRadius);
        return (
          <g key={i}>
            <path
              d={`M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`}
              fill={s.color}
              fillOpacity="0.3"
              stroke={s.color}
              strokeWidth="1.5"
            />
            <text x={mid.x} y={mid.y} fontSize="10.5" textAnchor="middle" className="fill-on-surface font-medium">
              {s.lines.map((line, li) => (
                <tspan key={li} x={mid.x} dy={li === 0 ? -((s.lines.length - 1) * 6) : 12}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function VennDiagram({ variant }) {
  const aOnly = <path d="M 65 18 A 32 32 0 0 0 65 82 A 32 32 0 0 1 65 18 Z" fill="var(--color-primary)" fillOpacity="0.35" />;
  const bOnly = <path d="M 95 18 A 32 32 0 0 1 95 82 A 32 32 0 0 0 95 18 Z" fill="var(--color-primary)" fillOpacity="0.35" />;
  return (
    <svg viewBox="0 0 160 100" className="w-full max-w-[150px]">
      <rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor" strokeWidth="2" className="text-outline" />
      <text x="12" y="20" fontSize="12" className="fill-on-surface font-semibold">A</text>
      <text x="140" y="20" fontSize="12" className="fill-on-surface font-semibold">B</text>
      {variant === "symmetricDiff" && <>{aOnly}{bOnly}</>}
      {variant === "union" && (
        <>
          <circle cx="65" cy="50" r="32" fill="var(--color-primary)" fillOpacity="0.35" />
          <circle cx="95" cy="50" r="32" fill="var(--color-primary)" fillOpacity="0.35" />
        </>
      )}
      {variant === "outsideOverlap" && (
        <>
          <rect x="4" y="4" width="152" height="92" fill="var(--color-primary)" fillOpacity="0.35" />
          <circle cx="65" cy="50" r="32" className="fill-surface" />
          <circle cx="95" cy="50" r="32" className="fill-surface" />
          {aOnly}{bOnly}
        </>
      )}
      {variant === "outsideOnly" && (
        <>
          <rect x="4" y="4" width="152" height="92" fill="var(--color-primary)" fillOpacity="0.35" />
          <circle cx="65" cy="50" r="32" className="fill-surface" />
          <circle cx="95" cy="50" r="32" className="fill-surface" />
        </>
      )}
      <circle cx="65" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-on-surface" />
      <circle cx="95" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-on-surface" />
    </svg>
  );
}

export const DIAGRAM_COMPONENTS = {
  circleAngle: CircleAngleDiagram,
  pieChart: PieChartDiagram,
};

export const VENN_VARIANTS = ["symmetricDiff", "union", "outsideOverlap", "outsideOnly"];
