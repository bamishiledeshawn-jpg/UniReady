import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-margin-mobile py-stack-lg">
      <div className="flex items-center gap-2 mb-stack-lg">
        <span className="material-symbols-outlined text-primary text-3xl font-bold">
          school
        </span>
        <span className="text-[24px] leading-8 font-bold text-primary tracking-tight">
          Uniready
        </span>
      </div>
      <div className="w-full max-w-[420px]">
        <Outlet />
      </div>
    </div>
  );
}