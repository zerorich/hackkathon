import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RotateCcw, X } from "lucide-react";
import { api } from "../lib/api";
import { EmptyView } from "../components/StateViews";
import { friendlyError } from "../lib/errorMessages";
import { clearCachedAttemptChallenge, getCachedAttemptChallenge } from "../lib/duel";

export default function AttemptPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const challenge = useMemo(() => getCachedAttemptChallenge(attemptId), [attemptId]);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(null);
  const [showExit, setShowExit] = useState(false);

  if (!challenge) {
    return (
      <div className="page">
        <EmptyView
          icon={<RotateCcw size={26} />}
          title="Urinish topilmadi"
          subtitle="Bu sahifa yangilanganda yuz berishi mumkin. Bosh sahifaga qaytib, yangi challenge boshlang."
          action={
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
              Bosh sahifaga qaytish
            </button>
          }
        />
      </div>
    );
  }

  const question = challenge.questions[index];
  const total = challenge.questions.length;
  const isLast = index === total - 1;
  const selectedOptionId = answers[question.id];

  async function selectOption(optionId) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
    setSaving(true);
    setSaveError(null);
    try {
      await api.put(`/attempts/${attemptId}/answers/${question.id}`, { selected_option_id: optionId });
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (!isLast) setIndex((i) => i + 1);
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    setFinishError(null);
    try {
      await api.post(`/attempts/${attemptId}/finish`);
      clearCachedAttemptChallenge(attemptId);
      navigate(`/attempt/${attemptId}/result`, { replace: true });
    } catch (err) {
      setFinishError(err);
      setFinishing(false);
    }
  }

  return (
    <div className="page attempt-page">
      <div className="attempt-topbar">
        <button className="icon-btn" onClick={() => setShowExit(true)} aria-label="Chiqish">
          <X size={18} />
        </button>
        <div className="attempt-progress-track">
          <div className="attempt-progress-fill" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <span className="attempt-progress-label">
          {index + 1} / {total}
        </span>
      </div>

      <div className="question-card">
        <h2>{question.prompt}</h2>
        <div className="option-list">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              className={`option-button${selectedOptionId === opt.id ? " selected" : ""}`}
              onClick={() => selectOption(opt.id)}
              disabled={saving && selectedOptionId !== opt.id}
            >
              {opt.text}
            </button>
          ))}
        </div>
        {saveError && <p className="field-error">Javob saqlanmadi: {friendlyError(saveError)}</p>}
      </div>

      {finishError && <p className="field-error center">{friendlyError(finishError)}</p>}

      {isLast ? (
        <button
          className="btn btn-primary btn-block"
          onClick={handleFinish}
          disabled={!selectedOptionId || finishing}
        >
          {finishing ? "Yakunlanmoqda…" : "Challenge'ni yakunlash"}
        </button>
      ) : (
        <button className="btn btn-primary btn-block" onClick={goNext} disabled={!selectedOptionId}>
          Keyingisi
        </button>
      )}

      {showExit && (
        <div className="modal-overlay" onClick={() => setShowExit(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Challenge'ni tark etasizmi?</h3>
            <p className="muted">Yakunlamaguningizcha bu urinish hisoblanmaydi.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowExit(false)}>
                Davom etaman
              </button>
              <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
