import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import { SUBJECTS, searchTopics } from "../data/questionBank";

export default function Practice() {
  const [query, setQuery] = useState("");
  const results = query.trim() ? searchTopics(query) : [];

  return (
    <div>
      <div className="mb-stack-lg">
        <h1 className="text-[32px] leading-10 font-bold text-on-surface mb-2">
          Practice
        </h1>
        <p className="text-text-secondary text-[18px] leading-7">
          Pick a subject, or search for a topic to jump straight in.
        </p>
      </div>

      {/* Topic search */}
      <div className="relative mb-stack-lg">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
          search
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Search for a topic — e.g. Logarithms, Cell Biology, Federalism"
          className="w-full bg-surface border border-outline-variant rounded-lg pl-12 pr-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />

        {results.length > 0 && (
          <div className="absolute z-10 mt-2 w-full bg-surface rounded-xl card-shadow overflow-hidden">
            {results.map((r) => (
              <Link
                key={`${r.subjectId}-${r.topic}`}
                to={`/practice/${r.subjectId}?topic=${encodeURIComponent(r.topic)}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-surface-container-highest last:border-b-0"
              >
                <div>
                  <p className="text-[14px] font-medium text-on-surface">{r.topic}</p>
                  <p className="text-[12px] text-text-secondary">{r.subjectName}</p>
                </div>
                <span className="material-symbols-outlined text-primary text-[18px]">
                  arrow_forward
                </span>
              </Link>
            ))}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="absolute z-10 mt-2 w-full bg-surface rounded-xl card-shadow px-4 py-3">
            <p className="text-[14px] text-text-secondary">No topics match "{query}"</p>
          </div>
        )}
      </div>

      {/* Subject grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-stack-md">
        {SUBJECTS.map((subject) => (
          <Card
            key={subject.id}
            as={Link}
            to={`/practice/${subject.id}`}
            className="flex flex-col items-start hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="bg-primary-container text-on-primary-container w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-2xl">{subject.icon}</span>
            </div>
            <h3 className="font-bold text-on-surface mb-1">{subject.name}</h3>
            <p className="text-[13px] text-text-secondary mb-3">
              {subject.topics.length} topics · 10 years of past questions
            </p>
            <span className="text-primary text-[14px] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform mt-auto">
              Browse
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
