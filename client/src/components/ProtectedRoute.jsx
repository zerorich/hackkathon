import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingView } from "./StateViews";

// eslint-disable-next-line react-refresh/only-export-components -- small routing helper shared with these guards
export function homePathFor(user) {
  return user?.role === "TEACHER" ? "/teacher/dashboard" : "/dashboard";
}

export function ProtectedRoute() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <LoadingView label="Sessiya tekshirilmoqda…" />;
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user && !user.onboarding_completed && location.pathname !== "/onboarding") {
    return (
      <Navigate
        to="/onboarding"
        replace
        state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }
  return <Outlet />;
}

export function RoleRoute({ role }) {
  const { user } = useAuth();
  if (user && user.role !== role) {
    return <Navigate to={homePathFor(user)} replace />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === "authenticated") {
    const from = location.state?.from;
    const returnTo = location.state?.returnTo;
    const destination = from?.pathname?.startsWith("/")
      ? `${from.pathname}${from.search || ""}${from.hash || ""}`
      : returnTo?.startsWith("/")
      ? returnTo
      : homePathFor(user);
    return <Navigate to={destination} replace />;
  }
  return <Outlet />;
}
