// Three-stop color interpolation (error -> warning -> success) so the
// heatmap reads as an actual continuous gradient tied to accuracy, not
// three fixed buckets with a hard edge at 50%/80%. Uses the app's real
// semantic colors as the stops, so it stays on-brand rather than
// introducing a generic red-yellow-green scale.
const GRADIENT_STOPS = [
  { at: 0, hex: "#FF7675" }, // error
  { at: 50, hex: "#F39C12" }, // warning
  { at: 100, hex: "#20C997" }, // success
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// Maps an accuracy percentage (0-100) to an RGB color by interpolating
// between whichever two gradient stops it falls between.
function accuracyToRgb(accuracy) {
  const clamped = Math.max(0, Math.min(100, accuracy));
  let lower = GRADIENT_STOPS[0];
  let upper = GRADIENT_STOPS[GRADIENT_STOPS.length - 1];

  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    if (clamped >= GRADIENT_STOPS[i].at && clamped <= GRADIENT_STOPS[i + 1].at) {
      lower = GRADIENT_STOPS[i];
      upper = GRADIENT_STOPS[i + 1];
      break;
    }
  }

  const span = upper.at - lower.at;
  const t = span === 0 ? 0 : (clamped - lower.at) / span;
  const lowerRgb = hexToRgb(lower.hex);
  const upperRgb = hexToRgb(upper.hex);

  return {
    r: lerp(lowerRgb.r, upperRgb.r, t),
    g: lerp(lowerRgb.g, upperRgb.g, t),
    b: lerp(lowerRgb.b, upperRgb.b, t),
  };
}

function accuracyToGradientStyle(accuracy, opacity = 1) {
  const { r, g, b } = accuracyToRgb(accuracy);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const gradientCssString = `linear-gradient(to right, ${GRADIENT_STOPS.map(
  (s) => `${s.hex} ${s.at}%`
).join(", ")})`;

// Horizontal grouped bar chart: correct vs incorrect count per topic.
// Plain SVG rather than a charting library — keeps bundle size down and
// this app's answer-count data is small/simple enough not to need one.
export function TopicBarChart({ data, labelKey = "topic" }) {
  if (data.length === 0) return null;

  const maxCount = Math.max(1, ...data.map((d) => Math.max(d.correct, d.incorrect)));
  const rowHeight = 44;
  const chartWidth = 100; // percentage-based, scales to container

  return (
    <div className="flex flex-col gap-1">
      {data.map((d) => (
        <div key={d[labelKey]} className="flex flex-col gap-0.5" style={{ minHeight: rowHeight }}>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-on-surface font-medium truncate pr-2">{d[labelKey]}</span>
            <span className="text-text-secondary flex-shrink-0">
              {d.correct}/{d.total}
            </span>
          </div>
          <div className="flex flex-col gap-[3px]">
            <div className="w-full h-[7px] bg-surface-container-low rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${(d.correct / maxCount) * chartWidth}%` }}
              />
            </div>
            <div className="w-full h-[7px] bg-surface-container-low rounded-full overflow-hidden">
              <div
                className="h-full bg-error rounded-full transition-all"
                style={{ width: `${(d.incorrect / maxCount) * chartWidth}%` }}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 mt-2 text-[12px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" /> Correct
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-error" /> Incorrect
        </span>
      </div>
    </div>
  );
}

// Grid of topic tiles shaded by accuracy on a continuous red -> amber ->
// green gradient (interpolated per-tile from the exact accuracy value,
// not snapped to a bucket), so two topics at 61% and 79% actually look
// different instead of both just being "the warning color."
export function TopicHeatmap({ data, labelKey = "topic" }) {
  if (data.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {data.map((d) => {
          const bg = accuracyToGradientStyle(d.accuracy, 0.16);
          const border = accuracyToGradientStyle(d.accuracy, 0.4);
          const text = accuracyToGradientStyle(d.accuracy, 1);
          return (
            <div
              key={d[labelKey]}
              className="rounded-lg p-3 flex flex-col justify-between gap-2 border transition-colors"
              style={{ backgroundColor: bg, borderColor: border }}
              title={`${d[labelKey]}: ${d.correct}/${d.total} correct`}
            >
              <span className="text-[12px] font-medium text-on-surface leading-tight line-clamp-2">
                {d[labelKey]}
              </span>
              <span className="text-[20px] font-bold" style={{ color: text }}>
                {d.accuracy}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Continuous gradient legend, replacing the old 3-dot bucket key */}
      <div className="mt-3">
        <div
          className="h-2 w-full rounded-full"
          style={{ background: gradientCssString }}
        />
        <div className="flex items-center justify-between mt-1 text-[11px] text-text-secondary">
          <span>0% · Weak</span>
          <span>50% · Developing</span>
          <span>100% · Strong</span>
        </div>
      </div>
    </div>
  );
}
