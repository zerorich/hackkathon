import { useState } from "react";
import { avatarImageUrl, avatarInitial } from "../lib/avatars";

export function Avatar({ user, size = 44 }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, fontSize: size * 0.42 };
  const seed = user?.avatar_url || user?.id || user?.display_name || "zehna";

  return (
    <div className="avatar" style={style}>
      {!broken ? (
        <img src={avatarImageUrl(seed)} alt="" onError={() => setBroken(true)} />
      ) : (
        avatarInitial(user?.display_name)
      )}
    </div>
  );
}

export function ProgressBar({ value, max, tone = "primary" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress-track">
      <div className={`progress-fill tone-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatPill({ icon, label, value }) {
  return (
    <div className="stat-pill">
      <span className="stat-pill-icon">{icon}</span>
      <span className="stat-pill-value">{value}</span>
      <span className="stat-pill-label">{label}</span>
    </div>
  );
}

export function KpiCard({ icon, label, value, tone }) {
  return (
    <div className="kpi-card">
      <span className="kpi-icon" style={tone ? { background: tone.bg, color: tone.fg } : undefined}>
        {icon}
      </span>
      <div className="kpi-card-body">
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{label}</span>
      </div>
    </div>
  );
}

export function DifficultyBadge({ difficulty }) {
  return <span className={`badge badge-${(difficulty || "").toLowerCase()}`}>{difficulty}</span>;
}

export function MasteryBadge({ category }) {
  if (!category) return null;
  return <span className={`badge badge-mastery-${category.toLowerCase()}`}>{category}</span>;
}

export function StatusBadge({ status }) {
  if (!status) return null;
  return <span className={`badge badge-status-${status.toLowerCase()}`}>{status}</span>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, icon, action, children, className = "" }) {
  return (
    <div className={`card ${className}`.trim()}>
      {(title || action) && (
        <div className="card-header">
          <span className="card-title">
            {icon} {title}
          </span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export function Carousel({ items, renderItem, keyFor }) {
  return (
    <div className="carousel">
      {items.map((item, i) => (
        <div key={keyFor ? keyFor(item, i) : i}>{renderItem(item, i)}</div>
      ))}
    </div>
  );
}

export function LeaderboardCarouselCard({ entry, rank }) {
  return (
    <div className="carousel-card">
      {rank <= 3 && <span className="rank-medal">{RANK_MEDALS[rank - 1]}</span>}
      <Avatar user={entry.user} size={52} />
      <span className="carousel-card-name">{entry.user?.display_name}</span>
      <span className="carousel-card-xp">{entry.total_xp ?? entry.period_xp ?? 0} XP</span>
    </div>
  );
}

export function BarChart({ data, valueKey = "value", labelKey = "label", max }) {
  const peak = max || Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div className="bar-chart-col" key={i}>
          <div
            className="bar-chart-bar"
            style={{ height: `${Math.max(4, Math.round((d[valueKey] / peak) * 100))}%` }}
            title={`${d[labelKey]}: ${d[valueKey]}`}
          />
          <span className="bar-chart-label">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}
