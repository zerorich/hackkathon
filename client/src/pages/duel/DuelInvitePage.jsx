import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, Search, Swords } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { useAuth } from "../../context/AuthContext";
import { LoadingView, EmptyView } from "../../components/StateViews";
import { Avatar, DifficultyBadge } from "../../components/ui";
import { friendlyError } from "../../lib/errorMessages";
import { cacheAttemptChallenge, linkAttemptToDuel, normalizeDuelStatus } from "../../lib/duel";

export default function DuelInvitePage() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(null);

  const { data: preview, loading, error } = useApiData(
    () => api.get(`/duels/code/${shareCode}`),
    [shareCode]
  );

  if (loading) return <LoadingView label="Challenge yuklanmoqda…" />;

  if (error) {
    if (error instanceof ApiError && error.code === "DUEL_EXPIRED") {
      return (
        <div className="page">
          <EmptyView icon={<Clock size={26} />} title="Bu taklifning muddati tugagan" subtitle="Do'stingizdan yangi havola so'rang." />
        </div>
      );
    }
    if (error instanceof ApiError && error.code === "DUEL_NOT_FOUND") {
      return (
        <div className="page">
          <EmptyView icon={<Search size={26} />} title="Taklif topilmadi" subtitle="Bu havola noto'g'ri bo'lishi mumkin." />
        </div>
      );
    }
    return (
      <div className="page">
        <EmptyView icon={<Search size={26} />} title="Yuklab bo'lmadi" subtitle={friendlyError(error)} />
      </div>
    );
  }

  const status = normalizeDuelStatus(preview.status);
  const isSelf = preview.challenger?.id === user?.id;

  async function handleAccept() {
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await api.post(`/duels/code/${shareCode}/accept`);
      cacheAttemptChallenge(res.opponent_attempt_id, res.challenge);
      linkAttemptToDuel(res.opponent_attempt_id, res.duel_id);
      navigate(`/attempt/${res.opponent_attempt_id}`);
    } catch (err) {
      setAcceptError(err);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="page">
      <div className="duel-invite-card">
        <Avatar user={preview.challenger} size={64} />
        <h1>{preview.challenger?.display_name} sizni chaqirdi!</h1>
        <p className="muted">
          {preview.subject_name} · {preview.topic_title}
        </p>
        <div className="topic-summary">
          <DifficultyBadge difficulty={preview.difficulty} />
          <span className="muted">{preview.question_count} savol</span>
        </div>

        {status === "WAITING" && !isSelf && (
          <>
            {acceptError && <p className="field-error">{friendlyError(acceptError)}</p>}
            <button className="btn btn-primary btn-block" onClick={handleAccept} disabled={accepting}>
              <Swords size={16} /> {accepting ? "Qabul qilinmoqda…" : "Challenge'ni qabul qilish"}
            </button>
          </>
        )}
        {status === "WAITING" && isSelf && (
          <p className="field-hint">Bu — sizning o'z taklifingiz. Uni do'stingizga ulashing.</p>
        )}
        {status === "ACTIVE" && (
          <>
            <EmptyView icon={<Swords size={26} />} title="Taklif allaqachon qabul qilingan" subtitle="Duel davom etmoqda." />
            <button className="btn btn-primary btn-block" onClick={() => navigate(`/duels/${preview.duel_id}`)}>
              Duelni ochish
            </button>
          </>
        )}
        {status === "COMPLETED" && (
          <>
            <EmptyView icon={<Swords size={26} />} title="Bu duel yakunlangan" subtitle="G'olib va natijalarni ko'ring." />
            <button className="btn btn-primary btn-block" onClick={() => navigate(`/duels/${preview.duel_id}`)}>
              Natijani ko'rish
            </button>
          </>
        )}
        {(status === "EXPIRED" || status === "CANCELLED") && (
          <EmptyView icon={<Clock size={26} />} title="Bu taklif endi mavjud emas." />
        )}
      </div>
    </div>
  );
}
