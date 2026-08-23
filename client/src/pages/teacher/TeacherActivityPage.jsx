import { useState } from "react";
import { Activity, CheckCircle2, Sparkles, Swords, UserPlus } from "lucide-react";
import { api } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { useTeacherClasses } from "../../context/TeacherClassContext";
import { LoadingView, ErrorView, EmptyView } from "../../components/StateViews";
import { PageHeader } from "../../components/ui";
import { ClassSwitcher } from "../../components/ClassSwitcher";
import { friendlyError } from "../../lib/errorMessages";

const EVENT_META = {
  ATTEMPT_COMPLETED: { icon: <CheckCircle2 size={16} />, label: "Challenge yakunladi" },
  DUEL_COMPLETED: { icon: <Swords size={16} />, label: "Duel yakunlandi" },
  CHALLENGE_CREATED: { icon: <Sparkles size={16} />, label: "Yangi challenge yaratildi" },
  MEMBER_JOINED: { icon: <UserPlus size={16} />, label: "Sinfga qo'shildi" },
};

export default function TeacherActivityPage() {
  const {
    activeClassId,
    classes,
    loading: classesLoading,
    error: classesError,
    reload: reloadClasses,
  } = useTeacherClasses();
  const [cursor, setCursor] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  const { loading, error, reload } = useApiData(async () => {
    if (!activeClassId) return null;
    const res = await api.get(`/teacher/classes/${activeClassId}/activity?limit=30`);
    setItems(res.items);
    setCursor(res.next_cursor);
    return res;
  }, [activeClassId]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const res = await api.get(`/teacher/classes/${activeClassId}/activity?limit=30&cursor=${encodeURIComponent(cursor)}`);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.next_cursor);
    } catch (err) {
      setLoadMoreError(err);
    } finally {
      setLoadingMore(false);
    }
  }

  if (classesLoading) return <LoadingView label="Yuklanmoqda…" />;
  if (classesError) return <ErrorView error={classesError} onRetry={reloadClasses} />;
  if (!classes || classes.length === 0) {
    return (
      <div className="responsive-page">
        <PageHeader title="Faoliyat" />
        <EmptyView icon={<Activity size={26} />} title="Avval sinf yarating" />
      </div>
    );
  }

  if (loading) return <LoadingView label="Faoliyat yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  return (
    <div className="responsive-page">
      <div className="toolbar-row">
        <PageHeader title="Faoliyat" subtitle="Sinfdagi so'nggi voqealar" />
        <ClassSwitcher />
      </div>

      {items.length === 0 ? (
        <EmptyView icon={<Activity size={26} />} title="Hali faoliyat yo'q" />
      ) : (
        <>
          <div className="topic-list">
            {items.map((e) => {
              const meta = EVENT_META[e.type] || { icon: <Activity size={16} />, label: e.type };
              return (
                <div key={e.id} className="list-card" style={{ cursor: "default" }}>
                  <span className="list-card-icon">{meta.icon}</span>
                  <div className="list-card-body">
                    <strong>{meta.label}</strong>
                    <span className="list-card-meta">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {loadMoreError && <p className="field-error">{friendlyError(loadMoreError)}</p>}
          {cursor && (
            <button className="btn btn-secondary btn-block" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Yuklanmoqda…" : "Ko'proq yuklash"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
