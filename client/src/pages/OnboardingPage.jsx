import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { friendlyError } from "../lib/errorMessages";
import { AVATAR_PRESETS, avatarImageUrl } from "../lib/avatars";

export default function OnboardingPage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacher = user?.role === "TEACHER";
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatar, setAvatar] = useState(user?.avatar_url || AVATAR_PRESETS[0]);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joinError, setJoinError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    setError(null);
    setJoinError(null);
    try {
      if (!isTeacher && inviteCode.trim()) {
        try {
          await api.post("/classes/join", { invite_code: inviteCode.trim().toUpperCase() });
        } catch (err) {
          setJoinError(err);
          return;
        }
      }
      await updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatar,
        onboarding_completed: true,
      });
      const returnTo = location.state?.returnTo;
      navigate(isTeacher ? "/teacher/classes" : returnTo?.startsWith("/") ? returnTo : "/dashboard", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="theme-guest">
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark">
            <Sparkles size={26} />
          </div>
          <h1>Profilingizni sozlang</h1>
          <p className="auth-tagline">
            {isTeacher
              ? "Ism va avatar tanlang — keyingi qadamda o'z sinfingizni yaratasiz."
              : "Ism va avatar tanlang — leaderboardda shu nom bilan ko'rinasiz."}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field-label" htmlFor="displayName">
              Ismingiz
            </label>
            <input
              id="displayName"
              className="text-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ismingiz"
              disabled={loading}
              autoFocus
            />

            <label className="field-label">Avatar</label>
            <div className="avatar-grid">
              {AVATAR_PRESETS.map((a) => (
                <button
                  type="button"
                  key={a}
                  className={`avatar-option${avatar === a ? " selected" : ""}`}
                  onClick={() => setAvatar(a)}
                  disabled={loading}
                >
                  <img src={avatarImageUrl(a)} alt={a} width={28} height={28} />
                </button>
              ))}
            </div>

            {!isTeacher && (
              <>
                <label className="field-label" htmlFor="inviteCode">
                  Sinf kodi (ixtiyoriy)
                </label>
                <input
                  id="inviteCode"
                  className="text-input"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="masalan: 9A-4F2K"
                  disabled={loading}
                />
                {joinError && <p className="field-error">Sinfga qo'shilmadi: {friendlyError(joinError)}</p>}
                <p className="field-hint">Kodingiz yo'qmi? Keyinroq profil orqali ham qo'shilishingiz mumkin.</p>
              </>
            )}

            {error && <p className="field-error">{friendlyError(error)}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading || !displayName.trim()}>
              {loading ? "Saqlanmoqda…" : isTeacher ? "Davom etish" : "O'qishni boshlash"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
