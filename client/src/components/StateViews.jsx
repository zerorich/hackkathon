import { AlertTriangle, Inbox } from "lucide-react";
import { friendlyError } from "../lib/errorMessages";

export function LoadingView({ label = "Yuklanmoqda…" }) {
  return (
    <div className="state-view">
      <div className="spinner" />
      <p className="state-label">{label}</p>
    </div>
  );
}

export function ErrorView({ error, onRetry, label }) {
  return (
    <div className="state-view">
      <div className="state-icon">
        <AlertTriangle size={22} />
      </div>
      <p className="state-label">{label || friendlyError(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function EmptyView({ icon, title, subtitle, action }) {
  return (
    <div className="state-view">
      <div className="state-icon">{icon || <Inbox size={22} />}</div>
      {title && <p className="state-title">{title}</p>}
      {subtitle && <p className="state-label">{subtitle}</p>}
      {action}
    </div>
  );
}
