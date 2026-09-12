import { Outlet } from "react-router-dom";
import TopAppBar from "./TopAppBar";
import BottomNav from "./BottomNav";

// Same shell for student + agency views, nav items just highlight based on route.
// CBT Simulator route can opt out of this shell later via a separate layout route.
export default function AppShell() {
  return (
    <div className="h-full min-h-screen flex flex-col pt-16 pb-20 md:pb-0">
      <TopAppBar
        streakDays={12}
        offline={true}
        userAvatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuCbeFd5Mn2xBqQ8hGwO83YsTOYAhqBMELaXY_jl8iZEhj7j7HyG9mZtN0X44zwoLbO4H4eebgIPcBMN-nMWJmkTRRF3ENuc43-R5BHM0bVOnv2inYpJJSD8U6IPMeVCMnuiuLJBDZZT0NxOq32WryMhW5zcvwbKOD03hsPJbV9aPp5zxmV56uOWaog0P2mezdSpeT1tZ2nS-198dPgDH3z-wq1ETegb8o1ltHNmmthTkdpoZ7MRbGxlkw"
      />
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
