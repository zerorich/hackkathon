import { useParams } from "react-router-dom";
import { CheckCircle2, Flame, Swords, Target, Trophy } from "lucide-react";
import { api } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { LoadingView, ErrorView, EmptyView } from "../../components/StateViews";
import { Avatar, StatPill, MasteryBadge, Card } from "../../components/ui";

export default function TeacherStudentDetailPage() {
  const { classId, studentId } = useParams();

  const { data, loading, error, reload } = useApiData(
    () => api.get(`/teacher/classes/${classId}/students/${studentId}`),
    [classId, studentId]
  );

  if (loading) return <LoadingView label="O'quvchi ma'lumotlari yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;
  if (!data?.profile) {
    return <EmptyView title="O'quvchi topilmadi" subtitle="O'quvchi sinfdan chiqarilgan bo'lishi mumkin." />;
  }

  const { profile, stats, topic_progress, duel_stats, recent_attempts } = data;

  return (
    <div className="responsive-page">
      <div className="profile-header">
        <Avatar user={profile} size={72} />
        <h1>{profile?.display_name}</h1>
      </div>

      <div className="stats-strip">
        <StatPill icon={<Trophy size={16} />} label="Daraja" value={stats.level} />
        <StatPill icon={<Target size={16} />} label="XP" value={stats.total_xp} />
        <StatPill icon={<Flame size={16} />} label="Streak" value={stats.streak} />
        <StatPill icon={<CheckCircle2 size={16} />} label="Yakunlangan" value={stats.completed_challenges} />
      </div>
      <p className="muted center">O'rtacha aniqlik: {Math.round(stats.average_accuracy)}%</p>

      <Card title="Duel statistikasi" icon={<Swords size={16} />}>
        <div className="duel-record">
          <div>
            <strong>{duel_stats.wins}</strong>
            <span className="muted">G'alaba</span>
          </div>
          <div>
            <strong>{duel_stats.losses}</strong>
            <span className="muted">Mag'lubiyat</span>
          </div>
          <div>
            <strong>{duel_stats.draws}</strong>
            <span className="muted">Durrang</span>
          </div>
        </div>
      </Card>

      <section className="section">
        <h3 className="section-title">Mavzular bo'yicha progress</h3>
        {topic_progress.length === 0 ? (
          <p className="muted">Hali ma'lumot yo'q.</p>
        ) : (
          topic_progress.map((t) => (
            <div key={t.topic_id} className="list-card" style={{ cursor: "default" }}>
              <div className="list-card-body">
                <strong>{t.title}</strong>
                <span className="list-card-meta">{t.attempts_count} urinish</span>
              </div>
              <MasteryBadge category={t.mastery_category} />
            </div>
          ))
        )}
      </section>

      <section className="section">
        <h3 className="section-title">So'nggi urinishlar</h3>
        {recent_attempts.length === 0 ? (
          <p className="muted">Hali urinish yo'q.</p>
        ) : (
          recent_attempts.map((a) => (
            <div key={a.id} className="list-card" style={{ cursor: "default" }}>
              <span className="list-card-icon">
                <Target size={16} />
              </span>
              <div className="list-card-body">
                <strong>Ball: {a.score ?? "—"}</strong>
                <span className="list-card-meta">{a.accuracy_percent != null ? `${Math.round(a.accuracy_percent)}% aniqlik` : ""}</span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
