import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { School } from "lucide-react";
import { api } from "../lib/api";
import { friendlyError } from "../lib/errorMessages";

export default function JoinPage() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.post("/classes/join", { invite_code: inviteCode.trim() });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="duel-invite-card">
        <div className="brand-mark">
          <School size={26} />
        </div>
        <h1>Sinfingizga qo'shiling</h1>
        <p className="auth-tagline">Kod uchun o'qituvchingizdan so'rang.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field-label" htmlFor="inviteCode">
            Taklif kodi
          </label>
          <input
            id="inviteCode"
            className="text-input"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="masalan: 9A-4F2K"
            disabled={loading}
            autoFocus
          />
          {error && <p className="field-error">{friendlyError(error)}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || !inviteCode.trim()}>
            {loading ? "Qo'shilmoqda…" : "Sinfga qo'shilish"}
          </button>
        </form>
      </div>
    </div>
  );
}
