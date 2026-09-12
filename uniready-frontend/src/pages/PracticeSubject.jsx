import { useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import Card from "../components/ui/Card";
import { getSubject, YEARS } from "../data/questionBank";

export default function PracticeSubject() {
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subject = getSubject(subjectId);

  const [selectedYear, setSelectedYear] = useState(YEARS[0]);
  // A topic can arrive pre-selected from the Practice page's search bar
  const [selectedTopic, setSelectedTopic] = useState(searchParams.get("topic") || null);

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-text-secondary gap-4">
        <p>Subject not found.</p>
        <Link to="/practice" className="text-primary font-medium">
          Back to Practice
        </Link>
      </div>
    );
  }

  const handleStart = () => {
    const params = new URLSearchParams({
      subject: subject.id,
      year: String(selectedYear),
    });
    if (selectedTopic) params.set("topic", selectedTopic);
    navigate(`/practice/exam?${params.toString()}`);
  };

  return (
    <div>
      <Link
        to="/practice"
        className="inline-flex items-center gap-1 text-[14px] text-text-secondary hover:text-primary transition-colors mb-stack-md"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        All subjects
      </Link>

      <div className="flex items-center gap-3 mb-stack-lg">
        <div className="bg-primary-container text-on-primary-container w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-2xl">{subject.icon}</span>
        </div>
        <div>
          <h1 className="text-[28px] leading-9 font-bold text-on-surface">{subject.name}</h1>
          <p className="text-text-secondary text-[14px]">
            Choose a year, and optionally narrow to one topic.
          </p>
        </div>
      </div>

      {/* Year picker */}
      <div className="mb-stack-lg">
        <h2 className="text-[14px] font-semibold text-text-secondary uppercase tracking-wide mb-stack-sm">
          Year
        </h2>
        <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
          {YEARS.map((year) => {
            const active = selectedYear === year;
            return (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`btn-spring rounded-lg py-3 text-[14px] font-semibold transition-colors ${
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic filter */}
      <div className="mb-stack-lg">
        <h2 className="text-[14px] font-semibold text-text-secondary uppercase tracking-wide mb-stack-sm">
          Topic <span className="normal-case text-text-secondary/70">(optional)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTopic(null)}
            className={`btn-spring rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
              selectedTopic === null
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
            }`}
          >
            All topics
          </button>
          {subject.topics.map((topic) => {
            const active = selectedTopic === topic;
            return (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`btn-spring rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-on-surface">
            {subject.name} · {selectedYear}
            {selectedTopic ? ` · ${selectedTopic}` : ""}
          </p>
          <p className="text-[13px] text-text-secondary">
            Timed CBT-style practice session
          </p>
        </div>
        <button
          onClick={handleStart}
          className="btn-spring w-full sm:w-auto bg-primary text-on-primary text-[14px] font-medium rounded-lg py-3 px-8 hover:bg-primary-hover flex items-center justify-center gap-2"
        >
          Start
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </Card>
    </div>
  );
}
