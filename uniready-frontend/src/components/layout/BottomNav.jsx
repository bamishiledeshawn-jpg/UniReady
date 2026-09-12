import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Home", to: "/", icon: "dashboard" },
  { label: "Practice", to: "/practice", icon: "quiz" },
  { label: "Results", to: "/results", icon: "analytics" },
  { label: "Business", to: "/business", icon: "confirmation_number" },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-surface py-2 border-t border-surface-container-highest shadow-sm">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-4 py-1 transition-transform duration-150 ${
              isActive
                ? "bg-primary-container/20 text-primary rounded-full scale-90"
                : "text-on-surface-variant hover:text-primary"
            }`
          }
        >
          <span className="material-symbols-outlined">{item.icon}</span>
          <span className="text-[12px] mt-1">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
