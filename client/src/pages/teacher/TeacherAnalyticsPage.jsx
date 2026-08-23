import { useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, Swords, Target, Users, Zap } from "lucide-react";
import { api } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { useTeacherClasses } from "../../context/TeacherClassContext";
import { LoadingView, ErrorView, EmptyView } from "../../components/StateViews";
import { PageHeader, KpiCard, Card, BarChart } from "../../components/ui";
import { ClassSwitcher } from "../../components/ClassSwitcher";

export default function TeacherAnalyticsPage() {
  const navigate = useNavigate();
  const { activeClassId, loading: classesLoading, error: classesError, classes } = useTeacherClasses();

  const { data, loading, error, reload } = useApiData(async () => {
    if (!activeClassId) return null;
    const [topics, overview] = await Promise.all([
      api.get(`/teacher/classes/${activeClassId}/topics/analytics`),
      api.get(`/teacher/classes/${activeClassId}/reports/overview`),
    ]);
    return { topics, overview };
  }, [activeClassId]);

  if (classesLoading) return <LoadingView label="Yuklanmoqda…" />;
  if (classesError) return <ErrorView error={classesError} />;
  if (!classes || classes.length === 0) {
    return (
      <div className="responsive-page">
        <PageHeader title="Tahlil" />
        <EmptyView icon={<BarChart3 size={26} />} title="Avval sinf yarating" subtitle="Tahlilni ko'rish uchun sinfingiz bo'lishi kerak." />
      </div>
    );
  }

  if (loading) return <LoadingView label="Tahlil yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  const { topics, overview } = data;
  const chartData = topics.slice(0, 8).map((t) => ({ label: t.topic.title.slice(0, 10), value: Math.round(t.average_accuracy) }));

  return (
    <div className="responsive-page">
      <div className="toolbar-row">
        <PageHeader title="Tahlil" subtitle="Sinf bo'yicha chuqur statistika" />
        <ClassSwitcher />
      </div>

      <div className="kpi-grid">
        <KpiCard icon={<Users size={18} />} value={overview.active_students} label="Faol o'quvchilar" tone={{ bg: "#eaf1ff", fg: "#1d4ed8" }} />
        <KpiCard icon={<Target size={18} />} value={`${Math.round(overview.avg_accuracy)}%`} label="O'rtacha aniqlik" tone={{ bg: "#ecfdf3", fg: "#15803d" }} />
        <KpiCard icon={<Zap size={18} />} value={overview.xp_earned} label="Jami XP" tone={{ bg: "#fffaeb", fg: "#b45309" }} />
        <KpiCard icon={<Swords size={18} />} value={overview.duels_completed} label="Yakunlangan duellar" tone={{ bg: "#fdf2ff", fg: "#a21caf" }} />
      </div>

      {chartData.length > 0 && (
        <Card title="Mavzular bo'yicha aniqlik (%)" icon={<BarChart3 size={16} />}>
          <BarChart data={chartData} />
        </Card>
      )}

      <section className="section">
        <h3 className="section-title">Barcha mavzular</h3>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mavzu</th>
                <th>Qatnashchilar</th>
                <th>Urinishlar</th>
                <th>Aniqlik</th>
                <th>Mastery</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.topic.id} className="clickable" onClick={() => navigate(`/teacher/topics/${t.topic.id}`)}>
                  <td>{t.topic.title}</td>
                  <td>{t.unique_participants}</td>
                  <td>{t.attempts_count}</td>
                  <td>{Math.round(t.average_accuracy)}%</td>
                  <td>{Math.round(t.mastery_average)}%</td>
                  <td>{t.is_weak && <span className="badge badge-status-failed">Zaif</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {overview.weak_topics?.length > 0 && (
        <Card title="Zaif mavzular" icon={<AlertTriangle size={16} />}>
          {overview.weak_topics.map((t) => (
            <div key={t.topic_id} className="list-card" style={{ cursor: "default" }}>
              <span className="list-card-icon">
                <AlertTriangle size={16} />
              </span>
              <div className="list-card-body">
                <strong>{t.title}</strong>
                <span className="list-card-meta">{Math.round(t.average_accuracy)}% aniqlik</span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
