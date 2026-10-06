import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

const NAV = [
  { to: "/admin", label: "Overview", icon: "dashboard", end: true },
  { to: "/admin/vouchers", label: "Vouchers", icon: "confirmation_number", end: false },
];

export default function AdminLayout() {
  const { isAuthenticated, admin, logout } = useAdminAuth();

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="bg-surface border-b md:border-b-0 md:border-r border-surface-container-highest p-4 md:p-6 md:w-60 md:min-h-screen flex flex-wrap md:flex-col items-center md:items-stretch justify-between gap-4 md:gap-8">
        <div>
          <h1 className="text-[20px] font-bold text-primary">UniReady</h1>
          <p className="text-[12px] text-text-secondary">Admin</p>
        </div>

        <nav className="flex md:flex-col gap-2 order-3 md:order-none w-full md:w-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-surface-container-low"
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="md:mt-auto flex items-center md:items-start md:flex-col gap-2">
          <p className="text-[12px] text-text-secondary truncate max-w-[10rem]">{admin?.name}</p>
          <button
            type="button"
            onClick={logout}
            className="text-[14px] font-medium text-text-secondary hover:text-primary transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-margin-mobile md:p-margin-desktop">
        <Outlet />
      </main>
    </div>
  );
}
