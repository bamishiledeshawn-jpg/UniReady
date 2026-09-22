import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";

// Shown once, right after signup verification, before the dashboard.
// Keeping this to just the one functional question (which exam) for now —
// the "make it feel personal" Duolingo-style flavor questions are a later
// polish pass, not blocking this from being useful today.
const EXAMS = [
  { id: "JAMB", label: "JAMB", icon: "school" },
  { id: "WAEC", label: "WAEC", icon: "workspace_premium" },
  { id: "NECO", label: "NECO", icon: "military_tech" },
];

export default function Onboarding() {
  const { setExamType } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSelect = async (examId) => {
    setSaving(true);
    setError(null);
    try {
      await setExamType(examId);
      navigate("/onboarding/diagnostic");
    } catch {
      setError("Couldn't save that — check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-12 px-4">
      <h1 className="text-[28px] leading-9 font-bold text-on-surface mb-2 text-center">
        Which exam are you preparing for?
      </h1>
      <p className="text-text-secondary text-[16px] text-center mb-8">
        We'll tailor everything on your dashboard around this.
      </p>

      <div className="flex flex-col gap-3">
        {EXAMS.map((exam) => (
          <Card
            key={exam.id}
            as="button"
            onClick={() => handleSelect(exam.id)}
            disabled={saving}
            className="flex items-center gap-4 text-left hover:shadow-md transition-shadow disabled:opacity-50"
          >
            <div className="bg-primary-container text-on-primary-container w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">{exam.icon}</span>
            </div>
            <p className="font-semibold text-on-surface text-[18px]">{exam.label}</p>
          </Card>
        ))}
      </div>

      {error && (
        <p className="text-error text-[14px] text-center mt-4">{error}</p>
      )}
    </div>
  );
}