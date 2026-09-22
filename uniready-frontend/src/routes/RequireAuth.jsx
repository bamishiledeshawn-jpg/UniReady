import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SEEN_INTRO_KEY } from "../pages/IntroSlides";

// Gates an entire route subtree behind login. Previously nothing did this —
// AppShell's routes (Dashboard, Practice, Results, Business) rendered
// unconditionally regardless of auth state, so a logged-out visitor saw the
// exact same app, just with a "Log In" button in the top bar instead of
// being sent to the login page at all. That's the bug this fixes: hitting
// "/" while logged out now redirects to /login (or /welcome, see below)
// instead of rendering the dashboard.
//
// `isAuthenticated` in AuthContext is read synchronously from localStorage
// (see readStoredSession in AuthContext.jsx) — there's no async "checking
// session" state to handle here, so this can decide immediately on render
// with no loading flash.
export default function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // First-ever visit (nothing in localStorage for this flag yet) gets
    // the personality/brand intro slides first; anyone who's already seen
    // them — including someone who just logged out — goes straight to
    // /login instead of seeing the slides again every time.
    const hasSeenIntro = localStorage.getItem(SEEN_INTRO_KEY) === "true";
    const target = hasSeenIntro ? "/login" : "/welcome";

    // `state` carries where the user was trying to go, so the login flow
    // can send them back afterward instead of always landing on "/".
    // OtpVerify.jsx doesn't currently read this — see HANDOFF note — but
    // wiring the redirect target through now means adding that "return to
    // where you were" behavior later doesn't need a routing change.
    return <Navigate to={target} replace state={{ from: location }} />;
  }

  return <Outlet />;
}