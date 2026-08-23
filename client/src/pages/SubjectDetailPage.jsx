import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, FolderOpen } from "lucide-react";
import { api } from "../lib/api";
import { useApiData } from "../lib/useApiData";
import { LoadingView, ErrorView, EmptyView } from "../components/StateViews";
import { PageHeader, DifficultyBadge, MasteryBadge } from "../components/ui";

export default function SubjectDetailPage() {
  const { subjectId } = useParams();
  const location = useLocation();
  const subjectHint = location.state?.subject;

  const { data, loading, error, reload } = useApiData(async () => {
    const [topics, progress] = await Promise.all([
      api.get(`/subjects/${subjectId}/topics`),
      api.get(`/me/topics/progress?subject_id=${subjectId}`),
    ]);
    const progressByTopic = Object.fromEntries(progress.map((p) => [p.topic_id, p]));
    return topics.map((t) => ({ ...t, progress: progressByTopic[t.id] || null }));
  }, [subjectId]);

  if (loading) return <LoadingView label="Mavzular yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  return (
    <div className="page">
      <PageHeader title={subjectHint?.name || "Mavzular"} />
      {data.length === 0 ? (
        <EmptyView icon={<FolderOpen size={26} />} title="Hali mavzular yo'q" subtitle="O'qituvchingiz bu fanga mavzu qo'shmagan." />
      ) : (
        <div className="topic-list">
          {data.map((t) => (
            <Link key={t.id} to={`/topics/${t.id}`} className="topic-card">
              <div className="topic-card-main">
                <strong>{t.title}</strong>
                {t.description && <span className="topic-card-desc">{t.description}</span>}
                <div className="topic-card-meta">
                  <DifficultyBadge difficulty={t.difficulty} />
                  {t.progress && <MasteryBadge category={t.progress.mastery_level} />}
                  {t.progress && <span>{t.progress.attempts_count} urinish</span>}
                </div>
              </div>
              <span className="chevron">
                <ChevronRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
