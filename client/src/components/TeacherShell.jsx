import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, BarChart3, GraduationCap, LayoutDashboard, LogOut, Menu, School } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./ui";

const NAV_ITEMS = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/teacher/classes", label: "Sinflar", icon: School },
  { to: "/teacher/analytics", label: "Tahlil", icon: BarChart3 },
  { to: "/teacher/activity", label: "Faoliyat", icon: Activity },
];

export function TeacherShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="teacher-shell" data-role="teacher">
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
      <aside className={`teacher-sidebar${open ? " open" : ""}`}>
        <div className="teacher-sidebar-brand">
          <div className="brand-badge">
            <GraduationCap size={18} />
          </div>
          <strong>Zehn AI</strong>
        </div>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-spacer" />

        <button type="button" className="sidebar-link" onClick={logout}>
          <LogOut size={18} />
          Chiqish
        </button>
        <div className="sidebar-footer">
          <Avatar user={user} size={36} />
          <div className="sidebar-footer-info">
            <strong>{user?.display_name}</strong>
            <span>O'qituvchi</span>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="teacher-topbar">
          <button type="button" className="icon-btn" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
          <strong>Zehn AI</strong>
          <Avatar user={user} size={32} />
        </div>
        <main className="teacher-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
