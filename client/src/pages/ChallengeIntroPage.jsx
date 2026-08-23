import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sparkles, Target } from "lucide-react";
import { api } from "../lib/api";
import { useApiData } from "../lib/useApiData";
import { LoadingView, ErrorView } from "../components/StateViews";
import { DifficultyBadge } from "../components/ui";
import { friendlyError } from "../lib/errorMessages";
import { cacheAttemptChallenge } from "../lib/duel";

const POLL_MS = 1500;

export default function ChallengeIntroPage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const { data: challenge, loading, error, reload } = useApiData(
    () => api.get(`/challenges/${challengeId}`),
    [challengeId]
  );

  const isGenerating = challenge && (challenge.status === "PENDING" || challenge.status === "PROCESSING");

  useEffect(() => {
    if (!isGenerating) return undefined;
    let cancelled = false;

    async function poll() {
      try {
        const status = await api.get(`/challenges/${challengeId}/status`);
        if (cancelled) return;
        if (status.status === "READY" || status.status === "FAILED") {
          reload();
          return;
        }
      } catch {
        /* transient — keep polling */
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }

    let timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, challengeId]);

  async function handleRetry() {
    setRetrying(true);
    setStartError(null);
    try {
      const res = await api.post(`/topics/${challenge.topic_id}/challenges/generate`, {
        difficulty: challenge.difficulty,
        question_count: challenge.question_count,
      });
      navigate(`/challenge/${res.challenge_id}`, { replace: true });
    } catch (err) {
      setStartError(err);
    } finally {
      setRetrying(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await api.post(`/challenges/${challengeId}/attempts`);
      cacheAttemptChallenge(res.attempt_id, res.challenge);
      navigate(`/attempt/${res.attempt_id}`);
    } catch (err) {
      setStartError(err);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <LoadingView label="Challenge yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  if (isGenerating) {
    return (
      <div className="page">
        <div className="generating-card">
          <div className="spinner" />
          <h2>Zehn AI challenge yaratmoqda…</h2>
          <p className="muted">Bu odatda bir necha soniya davom etadi.</p>
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row short" />
        </div>
      </div>
    );
  }

  if (challenge.status === "FAILED") {
    return (
      <div className="page">
        <ErrorView label="Zehn AI challenge yarata olmadi." />
        {startError && <p className="field-error center">{friendlyError(startError)}</p>}
        <button className="btn btn-primary btn-block" type="button" onClick={handleRetry} disabled={retrying}>
          {retrying ? "Qayta urinilmoqda…" : "Qayta urinish"}
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="challenge-intro-card">
        <div className="brand-mark">
          <Target size={26} />
        </div>
        <h1>{challenge.title}</h1>
        <div className="topic-summary">
          <DifficultyBadge difficulty={challenge.difficulty} />
          <span className="muted">{challenge.question_count} savol</span>
          <span className="muted">~{Math.max(2, Math.round(challenge.question_count * 0.6))} daqiqa</span>
        </div>
        <p className="muted">Barcha savollarga javob bering, so'ng natija, XP va streak yangilanishini ko'ring.</p>
        {startError && <p className="field-error">{friendlyError(startError)}</p>}
        <button className="btn btn-primary btn-block" onClick={handleStart} disabled={starting}>
          <Sparkles size={16} /> {starting ? "Boshlanmoqda…" : "Boshlash"}
        </button>
      </div>
    </div>
  );
}
