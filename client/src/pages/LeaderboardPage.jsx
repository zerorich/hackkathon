import { useState } from "react";
import { Crown, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { useApiData } from "../lib/useApiData";
import { useAuth } from "../context/AuthContext";
import { LoadingView, ErrorView, EmptyView } from "../components/StateViews";
import { Avatar, PageHeader } from "../components/ui";

async function loadLeaderboard(period) {
  const classes = await api.get("/classes/");
  const activeClass = classes?.[0];
  if (!activeClass) return { class: null, board: null };
  const board = await api.get(`/classes/${activeClass.id}/leaderboard?period=${period}&limit=50`);
  return { class: activeClass, board };
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("all");
  const { data, loading, error, reload } = useApiData(() => loadLeaderboard(period), [period]);

  if (loading) return <LoadingView label="Reyting yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  if (!data.class) {
    return (
      <div className="page">
        <PageHeader title="Reyting" />
        <EmptyView icon={<Trophy size={26} />} title="Avval sinfga qo'shiling" subtitle="Sinfga qo'shilgach reytingni ko'rasiz." />
      </div>
    );
  }

  const entries = data.board.entries;

  return (
    <div className="page">
      <PageHeader title="Reyting" subtitle={data.class.name} />
      <div className="tab-row">
        <button className={`tab${period === "week" ? " active" : ""}`} onClick={() => setPeriod("week")}>
          Shu hafta
        </button>
        <button className={`tab${period === "month" ? " active" : ""}`} onClick={() => setPeriod("month")}>
          Shu oy
        </button>
        <button className={`tab${period === "all" ? " active" : ""}`} onClick={() => setPeriod("all")}>
          Umumiy
        </button>
      </div>

      {period === "month" && entries.length > 0 && (
        <div className="hero-of-month">
          <Crown size={20} />
          <div>
            <strong>{entries[0].user?.display_name} — Oyning Hero'si</strong>
            <span className="muted"> · {entries[0].period_xp} XP</span>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyView icon={<Trophy size={26} />} title="Hali reyting ma'lumoti yo'q" subtitle="Challenge yakunlab reytingda paydo bo'ling." />
      ) : (
        <div className="leaderboard-list">
          {entries.map((entry) => (
            <div
              key={entry.user?.id}
              className={`leader-row rank-${entry.rank}${entry.is_current_user ? " is-me" : ""}`}
            >
              <span className="leader-rank">{entry.rank}</span>
              <Avatar user={entry.user} size={40} />
              <div className="leader-info">
                <strong>
                  {entry.user?.display_name}
                  {entry.is_current_user && " (siz)"}
                </strong>
                <span className="muted">{entry.completed_challenges} ta yakunlangan · 🔥 {entry.current_streak}</span>
              </div>
              <span className="leader-xp">
                {period === "week" || period === "month" ? entry.period_xp : entry.total_xp} XP
              </span>
            </div>
          ))}
        </div>
      )}
      {data.board.current_user_rank && (
        <p className="muted center">
          {user?.display_name}, sizning o'rningiz #{data.board.current_user_rank}
        </p>
      )}
    </div>
  );
}
