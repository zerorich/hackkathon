import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { useAuth } from "../../context/AuthContext";
import { LoadingView, ErrorView } from "../../components/StateViews";
import { Avatar } from "../../components/ui";
import { normalizeDuelStatus, duelStatusLabel } from "../../lib/duel";

function Side({ label, side, isYou, isWinner }) {
  if (!side?.user) {
    return (
      <div className="duel-side duel-side-empty">
        <span className="duel-side-label">{label}</span>
        <div className="muted">Kutilmoqda…</div>
      </div>
    );
  }
  const result = side.result;
  return (
    <div className={`duel-side${isWinner ? " winner" : ""}`}>
      <span className="duel-side-label">{label}</span>
      <Avatar user={side.user} size={56} />
      <strong>
        {side.user.display_name}
        {isYou && " (siz)"}
      </strong>
      {result?.status === "COMPLETED" ? (
        <>
          <div className="duel-score">{result.score}</div>
          <span className="muted">
            {result.correct_count}/{result.total_questions} to'g'ri
          </span>
        </>
      ) : (
        <span className="muted">Hali o'ynamoqda…</span>
      )}
    </div>
  );
}

export default function DuelDetailPage() {
  const { duelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: duel, loading, error, reload } = useApiData(() => api.get(`/duels/${duelId}`), [duelId]);

  if (loading) return <LoadingView label="Duel yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  const status = normalizeDuelStatus(duel.status);
  const myAttemptId =
    duel.challenger.user?.id === user?.id
      ? duel.challenger.result?.id
      : duel.opponent.user?.id === user?.id
      ? duel.opponent.result?.id
      : null;
  const myAttemptInProgress =
    (duel.challenger.user?.id === user?.id && duel.challenger.result?.status === "IN_PROGRESS") ||
    (duel.opponent.user?.id === user?.id && duel.opponent.result?.status === "IN_PROGRESS");

  let banner = null;
  if (status === "COMPLETED") {
    if (!duel.winner_id) {
      banner = "Durrang!";
    } else if (duel.winner_id === user?.id) {
      banner = "Siz g'olibsiz! 🏆";
    } else {
      banner = "Bu safar yutqazdingiz.";
    }
  } else if (status === "WAITING") {
    banner = "Do'stingiz qabul qilishini kutmoqda…";
  } else if (status === "ACTIVE") {
    banner = "Duel davom etmoqda…";
  } else if (status === "EXPIRED") {
    banner = "Bu duelning muddati tugagan.";
  }

  return (
    <div className="page">
      <div className="duel-result-banner">{banner}</div>
      <span className="badge" style={{ alignSelf: "center" }}>
        {duelStatusLabel(duel.status)}
      </span>

      <div className="duel-vs">
        <Side
          label="Chaqiruvchi"
          side={duel.challenger}
          isYou={duel.challenger.user?.id === user?.id}
          isWinner={status === "COMPLETED" && duel.winner_id === duel.challenger.user?.id}
        />
        <div className="duel-vs-mark">VS</div>
        <Side
          label="Raqib"
          side={duel.opponent}
          isYou={duel.opponent.user?.id === user?.id}
          isWinner={status === "COMPLETED" && duel.winner_id === duel.opponent.user?.id}
        />
      </div>

      {myAttemptInProgress && myAttemptId && (
        <button className="btn btn-primary btn-block" onClick={() => navigate(`/attempt/${myAttemptId}`)}>
          Urinishni davom ettirish
        </button>
      )}
      <button className="btn btn-secondary btn-block" onClick={() => navigate("/leaderboard")}>
        Reyting
      </button>
      <button className="btn btn-ghost btn-block" onClick={() => navigate("/dashboard")}>
        Bosh sahifaga qaytish
      </button>
    </div>
  );
}
