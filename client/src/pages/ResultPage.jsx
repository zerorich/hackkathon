import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bot, CheckCircle2, Copy, Flame, Share2, Swords, Target, Zap } from "lucide-react";
import { api } from "../lib/api";
import { useApiData } from "../lib/useApiData";
import { LoadingView, ErrorView } from "../components/StateViews";
import { friendlyError } from "../lib/errorMessages";
import { cacheAttemptChallenge, getDuelForAttempt, linkAttemptToDuel } from "../lib/duel";

export default function ResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [duelInfo, setDuelInfo] = useState(null);
  const [duelError, setDuelError] = useState(null);
  const [duelLoading, setDuelLoading] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [tryAgainLoading, setTryAgainLoading] = useState(false);

  const { data, loading, error, reload } = useApiData(async () => {
    const [attempt, stats] = await Promise.all([
      api.get(`/attempts/${attemptId}`),
      api.get("/me/stats"),
    ]);
    return { attempt, stats };
  }, [attemptId]);

  if (loading) return <LoadingView label="Natija hisoblanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  const { attempt, stats } = data;
  const isPerfect = attempt.accuracy_percent >= 100;
  const linkedDuelId = getDuelForAttempt(attemptId);

  async function handleChallengeFriend() {
    setDuelLoading(true);
    setDuelError(null);
    try {
      const duel = await api.post(`/attempts/${attemptId}/duels`);
      linkAttemptToDuel(attemptId, duel.duel_id);
      setDuelInfo(duel);
    } catch (err) {
      setDuelError(err);
    } finally {
      setDuelLoading(false);
    }
  }

  async function handleBotDuel() {
    setBotLoading(true);
    setDuelError(null);
    try {
      const res = await api.post(`/attempts/${attemptId}/duels/bot`);
      linkAttemptToDuel(attemptId, res.duel_id);
      navigate(`/duels/${res.duel_id}`);
    } catch (err) {
      setDuelError(err);
    } finally {
      setBotLoading(false);
    }
  }

  async function handleTryAgain() {
    setTryAgainLoading(true);
    try {
      const res = await api.post(`/challenges/${attempt.challenge_id}/attempts`);
      cacheAttemptChallenge(res.attempt_id, res.challenge);
      navigate(`/attempt/${res.attempt_id}`, { replace: true });
    } catch (err) {
      setDuelError(err);
      setTryAgainLoading(false);
    }
  }

  function shareUrl() {
    return `${window.location.origin}${duelInfo.share_path}`;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl());
    } catch {
      /* clipboard may be unavailable; the link is still visible to copy manually */
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Zehn AI", text: "Mening natijamni yenga oling!", url: shareUrl() });
      } catch {
        /* user cancelled share sheet */
      }
    } else {
      handleCopy();
    }
  }

  return (
    <div className="page result-page">
      {isPerfect && <div className="celebration">🎉 Mukammal natija! 🎉</div>}

      <div className="result-hero">
        <div className="result-score">{attempt.score}</div>
        <div className="muted">1000 balldan</div>
      </div>

      <div className="stats-strip">
        <div className="stat-pill">
          <span className="stat-pill-icon">
            <CheckCircle2 size={16} />
          </span>
          <span className="stat-pill-value">
            {attempt.correct_count}/{attempt.total_questions}
          </span>
          <span className="stat-pill-label">To'g'ri</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-icon">
            <Target size={16} />
          </span>
          <span className="stat-pill-value">{Math.round(attempt.accuracy_percent)}%</span>
          <span className="stat-pill-label">Aniqlik</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-icon">
            <Zap size={16} />
          </span>
          <span className="stat-pill-value">+{attempt.xp_awarded}</span>
          <span className="stat-pill-label">XP</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-icon">
            <Flame size={16} />
          </span>
          <span className="stat-pill-value">{stats.current_streak}</span>
          <span className="stat-pill-label">Streak</span>
        </div>
      </div>
      <p className="muted center">
        {stats.level}-daraja · jami {stats.total_xp} XP
      </p>

      <section className="section">
        <h3 className="section-title">Javoblar tahlili</h3>
        {attempt.questions.map((q, i) => (
          <div key={q.id} className={`review-card${q.is_correct ? " correct" : " incorrect"}`}>
            <strong>
              {i + 1}. {q.prompt}
            </strong>
            <div className="review-options">
              {q.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`review-option${opt.is_correct ? " is-correct" : ""}${
                    opt.id === q.selected_option_id && !opt.is_correct ? " is-wrong" : ""
                  }`}
                >
                  {opt.text}
                  {opt.is_correct && " ✓"}
                  {opt.id === q.selected_option_id && !opt.is_correct && " ✗"}
                </div>
              ))}
            </div>
            {q.explanation && <p className="review-explanation">{q.explanation}</p>}
          </div>
        ))}
      </section>

      {duelError && <p className="field-error center">{friendlyError(duelError)}</p>}

      {!linkedDuelId && (
        <>
          <button className="btn btn-primary btn-block" onClick={handleChallengeFriend} disabled={duelLoading}>
            <Swords size={16} /> {duelLoading ? "Duel yaratilmoqda…" : "Do'stni chaqirish"}
          </button>
          <button className="btn btn-secondary btn-block" onClick={handleBotDuel} disabled={botLoading}>
            <Bot size={16} /> {botLoading ? "Bot bilan duel boshlanmoqda…" : "Zehn AI Bot bilan duel"}
          </button>
        </>
      )}
      {linkedDuelId && (
        <button className="btn btn-primary btn-block" onClick={() => navigate(`/duels/${linkedDuelId}`)}>
          Duel natijasini ko'rish
        </button>
      )}
      <button className="btn btn-secondary btn-block" onClick={handleTryAgain} disabled={tryAgainLoading}>
        {tryAgainLoading ? "Boshlanmoqda…" : "Qayta urinish"}
      </button>
      <button className="btn btn-ghost btn-block" onClick={() => navigate("/dashboard")}>
        Bosh sahifaga qaytish
      </button>

      {duelInfo && (
        <div className="modal-overlay" onClick={() => setDuelInfo(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Duel yuborildi! 🎉</h3>
            <p className="muted">Bu havolani do'stingizga yuboring. Tez orada muddati tugaydi.</p>
            <div className="share-link">{shareUrl()}</div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleCopy}>
                <Copy size={15} /> Nusxalash
              </button>
              <button className="btn btn-primary" onClick={handleShare}>
                <Share2 size={15} /> Ulashish
              </button>
            </div>
            <button className="btn btn-ghost btn-block" onClick={() => setDuelInfo(null)}>
              Tayyor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
