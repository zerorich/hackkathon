import { Link, useNavigate } from "react-router-dom";
import { Flame, Layers, Sparkles, Swords, Target, Trophy, Zap } from "lucide-react";
import { api } from "../lib/api";
import { useApiData } from "../lib/useApiData";
import { useAuth } from "../context/AuthContext";
import { LoadingView, ErrorView, EmptyView } from "../components/StateViews";
import { Avatar, StatPill, ProgressBar, MasteryBadge, Carousel, LeaderboardCarouselCard } from "../components/ui";
import { normalizeDuelStatus, duelStatusLabel } from "../lib/duel";
import { heroTier } from "../lib/hero";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApiData(() => api.get("/me/dashboard"), []);

  if (loading) return <LoadingView label="Dashboard yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  const {
    class: schoolClass,
    total_xp,
    level,
    level_progress,
    streak,
    average_accuracy,
    subjects,
    recommended_topic,
    leaderboard_preview,
    active_duels,
    recent_attempts,
  } = data;

  if (!schoolClass) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Salom, {user?.display_name || "do'stim"} 👋</h1>
            <p className="page-subtitle">Keling, sizni sinfga qo'shamiz.</p>
          </div>
          <Avatar user={user} />
        </div>
        <EmptyView
          icon={<Layers size={26} />}
          title="Siz hali sinfda emassiz"
          subtitle="Fanlar, challenge'lar va reytingni ko'rish uchun o'qituvchingizdan kod oling."
          action={
            <Link className="btn btn-primary" to="/join">
              Sinfga qo'shilish
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Salom, {user?.display_name || "do'stim"} 👋</h1>
          <p className="page-subtitle">
            {schoolClass.name} · {schoolClass.grade}-sinf
          </p>
        </div>
        <Avatar user={user} />
      </div>

      {recommended_topic ? (
        <div className="hero-card" onClick={() => navigate(`/topics/${recommended_topic.topic_id}`)}>
          <div className="hero-card-tag">
            <Sparkles size={12} /> Zehna AI tavsiyasi
          </div>
          <h2>{recommended_topic.title}</h2>
          <p className="hero-card-note">
            "{recommended_topic.title}" mavzusida {Math.round(recommended_topic.mastery_percent)}% natija
            ko'rsatdingiz — bugun bir challenge yechib mustahkamlab qo'yaylik!
          </p>
          <div className="hero-card-meta">
            <MasteryBadge category={recommended_topic.mastery_category} />
            <span>~3-5 daqiqa</span>
          </div>
          <button className="btn" type="button">
            Challenge'ni boshlash
          </button>
        </div>
      ) : (
        <div className="hero-card hero-card-muted" onClick={() => navigate("/subjects")}>
          <div className="hero-card-tag">Boshlash</div>
          <h2>Fan tanlab mashq qiling</h2>
          <p className="hero-card-meta">Hali tavsiya yo'q — fanlaringizni ko'rib chiqing.</p>
          <button className="btn" type="button">
            Fanlarni ko'rish
          </button>
        </div>
      )}

      <div className="hero-tier-badge">
        <span className="hero-tier-icon">{heroTier(level).icon}</span>
        <span>
          Hero: <strong>{heroTier(level).name}</strong> · Daraja {level}
        </span>
      </div>

      <div className="stats-strip">
        <StatPill icon={<Zap size={16} />} label="XP" value={total_xp} />
        <StatPill icon={<Trophy size={16} />} label="Daraja" value={level} />
        <StatPill icon={<Flame size={16} />} label="Streak" value={streak} />
        <StatPill icon={<Target size={16} />} label="Aniqlik" value={`${Math.round(average_accuracy || 0)}%`} />
      </div>
      {level_progress && (
        <div className="level-progress">
          <ProgressBar value={level_progress.current_level_xp} max={level_progress.next_level_xp} />
          <span className="level-progress-label">
            {level_progress.current_level_xp} / {level_progress.next_level_xp} XP — Hero kuchayishiga
          </span>
        </div>
      )}

      {active_duels && active_duels.length > 0 && (
        <section className="section">
          <h3 className="section-title">Faol duel</h3>
          {active_duels.map((d) => (
            <Link key={d.id} to={`/duels/${d.id}`} className="list-card">
              <span className="list-card-icon">
                <Swords size={18} />
              </span>
              <div className="list-card-body">
                <strong>Duel davom etmoqda</strong>
                <span className="list-card-meta">{duelStatusLabel(normalizeDuelStatus(d.status))}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {subjects && subjects.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h3 className="section-title">Davom eting</h3>
            <Link to="/subjects" className="section-link">
              Barchasi
            </Link>
          </div>
          <div className="chip-row">
            {subjects.map((s) => (
              <Link key={s.id} to={`/subjects/${s.id}`} state={{ subject: s }} className="subject-chip">
                <span className="subject-chip-icon">
                  <Layers size={15} />
                </span>
                {s.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {leaderboard_preview && leaderboard_preview.entries?.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h3 className="section-title">Top o'quvchilar</h3>
            <Link to="/leaderboard" className="section-link">
              To'liq reyting
            </Link>
          </div>
          <Carousel
            items={leaderboard_preview.entries}
            keyFor={(entry) => entry.user?.id}
            renderItem={(entry, i) => <LeaderboardCarouselCard entry={entry} rank={i + 1} />}
          />
        </section>
      )}

      {recent_attempts && recent_attempts.length > 0 && (
        <section className="section">
          <h3 className="section-title">So'nggi faoliyat</h3>
          {recent_attempts.map((a) => (
            <div key={a.id} className="list-card" style={{ cursor: "default" }}>
              <span className="list-card-icon">{a.accuracy_percent >= 100 ? <Trophy size={18} /> : <Target size={18} />}</span>
              <div className="list-card-body">
                <strong>
                  {a.correct_count}/{a.total_questions} to'g'ri
                </strong>
                <span className="list-card-meta">+{a.xp_awarded} XP</span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
