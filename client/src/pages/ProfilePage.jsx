import { useState } from "react";
import { CheckCircle2, Flame, LogOut, Star, Target, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { useApiData } from "../lib/useApiData";
import { useAuth } from "../context/AuthContext";
import { LoadingView, ErrorView } from "../components/StateViews";
import { Avatar, StatPill } from "../components/ui";
import { AVATAR_PRESETS, avatarImageUrl } from "../lib/avatars";
import { heroTier } from "../lib/hero";
import { friendlyError } from "../lib/errorMessages";

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.display_name || "");
  const [avatar, setAvatar] = useState(user?.avatar_url || AVATAR_PRESETS[0]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const { data, loading, error, reload } = useApiData(async () => {
    const [dashboard, stats] = await Promise.all([
      api.get("/me/dashboard"),
      api.get("/me/stats"),
    ]);
    return { dashboard, stats };
  }, []);

  if (loading) return <LoadingView label="Profil yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  const { dashboard, stats } = data;

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile({ display_name: name.trim(), avatar_url: avatar });
      setEditing(false);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="profile-header">
        <Avatar user={user} size={72} />
        {!editing ? (
          <>
            <h1>{user?.display_name}</h1>
            <p className="muted">
              {dashboard.class ? `${dashboard.class.name} · ${dashboard.class.grade}-sinf` : "Hali sinfda emassiz"}
            </p>
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
              Profilni tahrirlash
            </button>
          </>
        ) : (
          <form onSubmit={handleSave} className="auth-form">
            <input
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ismingiz"
            />
            <div className="avatar-grid">
              {AVATAR_PRESETS.map((a) => (
                <button
                  type="button"
                  key={a}
                  className={`avatar-option${avatar === a ? " selected" : ""}`}
                  onClick={() => setAvatar(a)}
                >
                  <img src={avatarImageUrl(a)} alt={a} width={28} height={28} />
                </button>
              ))}
            </div>
            {saveError && <p className="field-error">{friendlyError(saveError)}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Bekor qilish
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
                {saving ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="hero-tier-badge" style={{ alignSelf: "center" }}>
        <span className="hero-tier-icon">{heroTier(stats.level).icon}</span>
        <span>
          Hero: <strong>{heroTier(stats.level).name}</strong>
        </span>
      </div>

      <div className="stats-strip">
        <StatPill icon={<Trophy size={16} />} label="Daraja" value={stats.level} />
        <StatPill icon={<Star size={16} />} label="Jami XP" value={stats.total_xp} />
        <StatPill icon={<Flame size={16} />} label="Streak" value={stats.current_streak} />
        <StatPill icon={<Flame size={16} />} label="Eng yaxshi streak" value={stats.best_streak} />
      </div>
      <div className="stats-strip">
        <StatPill icon={<CheckCircle2 size={16} />} label="Yakunlangan" value={stats.completed_challenges} />
        <StatPill icon={<Target size={16} />} label="Aniqlik" value={`${Math.round(stats.average_accuracy)}%`} />
      </div>

      <section className="section">
        <h3 className="section-title">Duel statistikasi</h3>
        <div className="duel-record">
          <div>
            <strong>{stats.duel_wins}</strong>
            <span className="muted">G'alaba</span>
          </div>
          <div>
            <strong>{stats.duel_losses}</strong>
            <span className="muted">Mag'lubiyat</span>
          </div>
          <div>
            <strong>{stats.duel_draws}</strong>
            <span className="muted">Durrang</span>
          </div>
        </div>
      </section>

      <button className="btn btn-secondary btn-block" onClick={logout}>
        <LogOut size={16} /> Chiqish
      </button>
    </div>
  );
}
