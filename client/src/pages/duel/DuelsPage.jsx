import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Clock3, Swords } from "lucide-react";
import { api } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { LoadingView, ErrorView, EmptyView } from "../../components/StateViews";
import { PageHeader } from "../../components/ui";
import { duelStatusLabel } from "../../lib/duel";
import { friendlyError } from "../../lib/errorMessages";

export default function DuelsPage() {
  const [cursor, setCursor] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  const { loading, error, reload } = useApiData(async () => {
    const res = await api.get("/me/duels?limit=20");
    setItems(res.items);
    setCursor(res.next_cursor);
    return res;
  }, []);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const res = await api.get(`/me/duels?limit=20&cursor=${encodeURIComponent(cursor)}`);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.next_cursor);
    } catch (err) {
      setLoadMoreError(err);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return <LoadingView label="Duellar yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  return (
    <div className="page">
      <PageHeader title="Duellar" />
      {items.length === 0 ? (
        <EmptyView
          icon={<Swords size={26} />}
          title="Hali duel yo'q"
          subtitle="Challenge yakunlab, 'Do'stni chaqirish' tugmasini bosing."
        />
      ) : (
        <>
          <div className="topic-list">
            {items.map((d) => (
              <Link key={d.id} to={`/duels/${d.id}`} className="topic-card">
                <div className="topic-card-main">
                  <div className="duel-list-title">
                    <strong>{d.challenge?.topic_title || d.challenge?.title || "Duel"}</strong>
                    <span className={`badge duel-status-${d.status.toLowerCase()}`}>{duelStatusLabel(d.status)}</span>
                  </div>
                  <span className="topic-card-desc">
                    {d.is_challenger ? "Siz" : d.challenger?.display_name || "Raqib"} vs {d.is_challenger ? d.opponent?.display_name || "Kutilmoqda…" : "Siz"}
                  </span>
                  {d.status === "COMPLETED" ? (
                    <span className="duel-list-score">
                      {d.creator_score ?? 0} : {d.opponent_score ?? 0}
                    </span>
                  ) : (
                    <span className="topic-card-desc"><Clock3 size={13} /> {d.challenge?.question_count || 0} savol</span>
                  )}
                </div>
                <span className="chevron">
                  <ChevronRight size={18} />
                </span>
              </Link>
            ))}
          </div>
          {cursor && (
            <>
              {loadMoreError && <p className="field-error center">{friendlyError(loadMoreError)}</p>}
              <button className="btn btn-secondary btn-block" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Yuklanmoqda…" : loadMoreError ? "Qayta urinish" : "Ko'proq yuklash"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
