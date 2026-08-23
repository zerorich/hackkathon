import { NavLink, Outlet } from "react-router-dom";
import { Home, LayoutGrid, MessageCircle, Sparkles, Swords, Trophy, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./ui";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Bosh sahifa", icon: Home },
  { to: "/subjects", label: "Fanlar", icon: LayoutGrid },
  { to: "/ai", label: "Zehna AI", icon: MessageCircle },
  { to: "/leaderboard", label: "Reyting", icon: Trophy },
  { to: "/duels", label: "Duellar", icon: Swords },
  { to: "/profile", label: "Profil", icon: UserRound },
];

export function AppShell() {
  const { user } = useAuth();

  return (
    <div className="app-shell" data-role="student">
      <aside className="student-sidebar">
        <div className="teacher-sidebar-brand">
          <div className="brand-badge">
            <Sparkles size={18} />
          </div>
          <strong>Zehna</strong>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <Avatar user={user} size={36} />
          <div className="sidebar-footer-info">
            <strong>{user?.display_name}</strong>
            <span>O'quvchi</span>
          </div>
        </div>
      </aside>

      <div className="app-content-wrap">
        <main className="app-content">
          <Outlet />
        </main>
        <nav className="bottom-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">
                <item.icon size={20} />
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
