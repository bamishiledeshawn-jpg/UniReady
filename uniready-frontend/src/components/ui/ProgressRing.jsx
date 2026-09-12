export default function ProgressRing({
  percent = 0,
  size = 128,
  strokeWidth = 8,
  label = "Ready",
  colorClass = "text-success",
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-surface-container-highest stroke-current"
          cx="50"
          cy="50"
          fill="transparent"
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={`${colorClass} stroke-current progress-ring__circle`}
          cx="50"
          cy="50"
          fill="transparent"
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[24px] leading-8 font-bold ${colorClass}`}>
          {percent}%
        </span>
        <span className="text-[12px] text-text-secondary">{label}</span>
      </div>
    </div>
  );
}
