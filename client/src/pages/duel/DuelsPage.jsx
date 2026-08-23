import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Swords } from "lucide-react";
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
                  <strong>{duelStatusLabel(d.status)}</strong>
                  <span className="topic-card-desc">Kod: {d.share_code}</span>
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
