import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Lightbulb, Swords, Target, Trophy, Users } from "lucide-react";
import { api } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { useTeacherClasses } from "../../context/TeacherClassContext";
import { LoadingView, ErrorView, EmptyView } from "../../components/StateViews";
import { PageHeader, Card, KpiCard, Avatar } from "../../components/ui";
import { ClassSwitcher } from "../../components/ClassSwitcher";
import { CreateClassModal } from "../../components/CreateClassModal";

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const {
    classes,
    activeClassId,
    loading: classesLoading,
    error: classesError,
    reload: reloadClasses,
  } = useTeacherClasses();
  const [showCreate, setShowCreate] = useState(false);

  const { data, loading, error, reload } = useApiData(
    () => (activeClassId ? api.get(`/teacher/classes/${activeClassId}/dashboard`) : Promise.resolve(null)),
    [activeClassId]
  );

  if (classesLoading) return <LoadingView label="Sinflar yuklanmoqda…" />;
  if (classesError) return <ErrorView error={classesError} onRetry={reloadClasses} />;

  if (!classes || classes.length === 0) {
    return (
      <div className="responsive-page">
        <PageHeader title="Dashboard" />
        <EmptyView
          icon={<Users size={30} />}
          title="Sizda hali sinf yo'q"
          subtitle="Birinchi sinfingizni yarating va o'quvchilarni taklif qiling."
          action={
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Sinf yaratish
            </button>
          }
        />
        {showCreate && (
          <CreateClassModal onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />
        )}
      </div>
    );
  }

  if (loading) return <LoadingView label="Dashboard yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;
  if (!data) return <EmptyView icon={<Users size={30} />} title="Sinf tanlanmagan" />;

  const insight = data.weak_topics?.[0]
    ? `AI aniqladi: "${data.weak_topics[0].title}" mavzusida sinf o'rtacha aniqligi ${Math.round(
        data.weak_topics[0].average_accuracy
      )}%. Qo'shimcha mashq tavsiya etiladi.`
    : "Hozircha zaif mavzular aniqlanmadi — sinf yaxshi natija ko'rsatmoqda.";

  return (
    <div className="responsive-page">
      <div className="toolbar-row">
        <PageHeader title="Dashboard" subtitle="Sinf ko'rsatkichlariga umumiy nazar" />
        <ClassSwitcher />
      </div>

      <div className="kpi-grid">
        <KpiCard
          icon={<Users size={20} />}
          value={data.total_students}
          label="O'quvchilar"
          tone={{ bg: "#eaf1ff", fg: "#1d4ed8" }}
        />
        <KpiCard
          icon={<Target size={20} />}
          value={`${Math.round(data.average_accuracy)}%`}
          label="O'rtacha aniqlik"
          tone={{ bg: "#ecfdf3", fg: "#15803d" }}
        />
        <KpiCard
          icon={<Trophy size={20} />}
          value={data.total_challenges}
          label="Challenge'lar"
          tone={{ bg: "#fffaeb", fg: "#b45309" }}
        />
        <KpiCard
          icon={<Swords size={20} />}
          value={data.total_duels}
          label="Duellar"
          tone={{ bg: "#fdf2ff", fg: "#a21caf" }}
        />
      </div>

      <div className="dashboard-grid">
        <Card title="Zaif mavzular" icon={<AlertTriangle size={16} />}>
          {data.weak_topics?.length ? (
            data.weak_topics.map((t) => (
              <div key={t.topic_id} className="list-card" style={{ cursor: "default" }}>
                <span className="list-card-icon">
                  <AlertTriangle size={16} />
                </span>
                <div className="list-card-body">
                  <strong>{t.title}</strong>
                  <span className="list-card-meta">O'rtacha aniqlik: {Math.round(t.average_accuracy)}%</span>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">Zaif mavzular topilmadi.</p>
          )}
        </Card>

        <Card title="AI Insight" icon={<Lightbulb size={16} />} className="insight-card">
          <div style={{ display: "flex", gap: 12 }}>
            <span className="insight-icon">
              <Lightbulb size={18} />
            </span>
            <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{insight}</p>
          </div>
        </Card>
      </div>

      <Card title="Faol challenge'lar" icon={<Trophy size={16} />}>
        <p className="muted">
          Jami {data.total_challenges} ta challenge yaratilgan. Boshqarish uchun "Sinflar" bo'limiga o'ting.
        </p>
        <button className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/teacher/classes")}>
          Sinf va mavzularni boshqarish
        </button>
      </Card>

      <Card title="Top o'quvchilar" icon={<Trophy size={16} />}>
        {data.top_students?.length ? (
          data.top_students.map((s, i) => (
            <div key={s.user_id} className="list-card" style={{ cursor: "default" }}>
              <span className="leader-rank">{i + 1}</span>
              <Avatar user={{ id: s.user_id, display_name: s.display_name }} size={36} />
              <div className="list-card-body">
                <strong>{s.display_name}</strong>
                <span className="list-card-meta">
                  {s.attempts_completed} ta yakunlangan · streak {s.streak}
                </span>
              </div>
              <span className="leader-xp">{s.total_xp} XP</span>
            </div>
          ))
        ) : (
          <p className="muted">Hali natijalar yo'q.</p>
        )}
      </Card>
    </div>
  );
}
