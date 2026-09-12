import { createBrowserRouter } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import AuthLayout from "../components/layout/AuthLayout";
import RequireAuth from "./RequireAuth";
import Dashboard from "../pages/Dashboard";
import Practice from "../pages/Practice";
import PracticeSubject from "../pages/PracticeSubject";
import Results from "../pages/Results";
import Business from "../pages/Business";
import BusinessGenerate from "../pages/BusinessGenerate";
import CbtExam from "../pages/CbtExam";
import AuthEntry from "../pages/AuthEntry";
import OtpVerify from "../pages/OtpVerify";

// CBT Simulator and the auth flow both get their own layout routes (no
// top/bottom nav) — sit outside AppShell.
//
// Everything under RequireAuth (the whole logged-in app, including the exam)
// now actually requires login — previously these routes had no auth check
// at all, so a logged-out visitor saw the full dashboard regardless, with
// only the top bar's "Log In" vs. avatar differing. /login and /login/verify
// stay outside RequireAuth, obviously — that's the one place a logged-out
// visitor is supposed to land.
export const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <Dashboard /> },
          { path: "/practice", element: <Practice /> },
          { path: "/practice/:subjectId", element: <PracticeSubject /> },
          { path: "/results", element: <Results /> },
          { path: "/business", element: <Business /> },
          { path: "/business/generate", element: <BusinessGenerate /> },
        ],
      },
      {
        path: "/practice/exam",
        element: <CbtExam />,
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <AuthEntry /> },
      { path: "/login/verify", element: <OtpVerify /> },
    ],
  },
]);