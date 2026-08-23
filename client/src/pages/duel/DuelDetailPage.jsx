import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, RefreshCw, Share2 } from "lucide-react";
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
          <span className="muted">{formatDuration(result.duration_seconds)}</span>
        </>
      ) : (
        <span className="muted">Hali o'ynamoqda…</span>
      )}
    </div>
  );
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "Vaqt noma'lum";
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return mins ? `${mins}:${String(rest).padStart(2, "0")}` : `${rest} soniya`;
}

export default function DuelDetailPage() {
  const { duelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: duel, loading, error, reload } = useApiData(() => api.get(`/duels/${duelId}`), [duelId]);
  const polledStatus = normalizeDuelStatus(duel?.status);

  useEffect(() => {
    if (!["WAITING", "ACTIVE"].includes(polledStatus)) return undefined;
    const timer = window.setInterval(() => reload({ silent: true }), 4000);
    return () => window.clearInterval(timer);
  }, [polledStatus, reload]);

  if (loading) return <LoadingView label="Duel yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  const status = polledStatus;
  const myAttemptId =
    duel.challenger.user?.id === user?.id
      ? duel.challenger.result?.id
      : duel.opponent.user?.id === user?.id
      ? duel.opponent.result?.id
      : null;
  const myAttemptInProgress =
    (duel.challenger.user?.id === user?.id && duel.challenger.result?.status === "IN_PROGRESS") ||
    (duel.opponent.user?.id === user?.id && duel.opponent.result?.status === "IN_PROGRESS");
  const inviteUrl = `${window.location.origin}/duel/${duel.share_code}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Zehn AI duel", text: "Natijamni yenga olasizmi?", url: inviteUrl });
        return;
      } catch {
        return;
      }
    }
    await copyInvite();
  }

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

      {duel.challenge && (
        <div className="duel-challenge-summary">
          <strong>{duel.challenge.title}</strong>
          <span className="muted">
            {duel.challenge.difficulty} · {duel.challenge.question_count} savol
          </span>
        </div>
      )}

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

      {status === "COMPLETED" && duel.winner_bonus_xp > 0 && (
        <div className="duel-bonus">🏆 G'olib uchun +{duel.winner_bonus_xp} XP</div>
      )}

      {status === "WAITING" && duel.challenger.user?.id === user?.id && (
        <div className="duel-share-panel">
          <span className="muted">Taklif havolasini do'stingizga yuboring</span>
          <div className="share-link">{inviteUrl}</div>
          <div className="duel-share-actions">
            <button className="btn btn-secondary" onClick={copyInvite}>
              <Copy size={15} /> {copied ? "Nusxalandi" : "Nusxalash"}
            </button>
            <button className="btn btn-primary" onClick={shareInvite}>
              <Share2 size={15} /> Ulashish
            </button>
          </div>
        </div>
      )}

      {myAttemptInProgress && myAttemptId && (
        <button className="btn btn-primary btn-block" onClick={() => navigate(`/attempt/${myAttemptId}`)}>
          Urinishni davom ettirish
        </button>
      )}
      {(status === "WAITING" || status === "ACTIVE") && (
        <button className="btn btn-secondary btn-block" onClick={() => reload()}>
          <RefreshCw size={15} /> Holatni yangilash
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
