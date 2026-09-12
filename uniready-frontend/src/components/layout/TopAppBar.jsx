import { NavLink } from "react-router-dom";
import ProfileMenu from "./ProfileMenu";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Practice", to: "/practice" },
  { label: "Results", to: "/results" },
  { label: "Business", to: "/business" },
];

export default function TopAppBar({ streakDays = 12, offline = true, userAvatarUrl }) {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed w-full top-0 z-50 bg-surface border-b border-surface-container-highest md:border-none md:shadow-sm">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto h-16">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl font-bold">
            school
          </span>
          <span className="text-[24px] leading-8 font-bold text-primary tracking-tight">
            UniReady
          </span>
        </div>

        <nav className="hidden md:flex gap-6 items-center h-full">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `h-full flex items-center px-2 transition-colors hover:bg-surface-container ${
                  isActive
                    ? "text-primary font-bold border-b-2 border-primary"
                    : "text-on-surface-variant"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center bg-tertiary-container/20 text-tertiary rounded-full px-3 py-1 gap-1">
            <span className="material-symbols-outlined text-[18px]">
              local_fire_department
            </span>
            <span className="text-[14px] font-bold">{streakDays} Days</span>
          </div>

          <div
            className={`hidden md:flex items-center rounded-full px-3 py-1 gap-1 border ${
              offline
                ? "bg-success/10 text-success border-success/20"
                : "bg-surface-container-high text-on-surface-variant border-surface-container-highest"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {offline ? "cloud_done" : "cloud_off"}
            </span>
            <span className="text-[12px] font-semibold tracking-wide">
              {offline ? "Offline: Ready" : "Offline: Not Ready"}
            </span>
          </div>

          <button className="text-on-surface hover:bg-surface-container-high rounded-full p-2 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>

          {isAuthenticated ? (
            <ProfileMenu userAvatarUrl={userAvatarUrl} />
          ) : (
            <NavLink
              to="/login"
              className="flex items-center gap-1 text-[14px] font-medium text-primary hover:bg-primary/10 rounded-full px-3 py-1.5 transition-colors"
            >
              Log In
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
