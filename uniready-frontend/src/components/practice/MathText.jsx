import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

// Splits "Evaluate $x^2+1$ at zero" into plain-text and $...$ math segments
// and renders the math parts with KaTeX. Keeps question content authorable
// as a single readable string instead of manually composing JSX per question.
export default function MathText({ text, className = "" }) {
  const parts = text.split(/(\$[^$]+\$)/g).filter((p) => p.length > 0);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$")) {
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
