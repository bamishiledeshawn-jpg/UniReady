export default function Card({ children, className = "", glow = false, as: Tag = "div", ...props }) {
  return (
    <Tag
      className={`bg-surface rounded-xl p-6 ${
        glow ? "glow-effect border-2" : "card-shadow"
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
