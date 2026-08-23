import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Archive, CheckCircle2, Plus, Sparkles, Target, Trash2, TrendingDown, TrendingUp, Users } from "lucide-react";
import { api } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { LoadingView, ErrorView, EmptyView } from "../../components/StateViews";
import { PageHeader, DifficultyBadge, StatusBadge, Avatar, KpiCard, Card } from "../../components/ui";
import { friendlyError } from "../../lib/errorMessages";

function emptyQuestion() {
  return {
    key: Math.random().toString(36).slice(2),
    prompt: "",
    points: 1,
    explanation: "",
    options: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
    ],
  };
}

function ManualChallengeForm({ topicId, difficulty, onDone, onCancel }) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function updateQuestion(key, patch) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function updateOption(qKey, idx, patch) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey ? { ...q, options: q.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)) } : q
      )
    );
  }

  function setCorrect(qKey, idx) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey ? { ...q, options: q.options.map((o, i) => ({ ...o, is_correct: i === idx })) } : q
      )
    );
  }

  function addOption(qKey) {
    setQuestions((qs) =>
      qs.map((q) => (q.key === qKey && q.options.length < 4 ? { ...q, options: [...q.options, { text: "", is_correct: false }] } : q))
    );
  }

  function removeOption(qKey, idx) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.key !== qKey || q.options.length <= 2) return q;
        const options = q.options.filter((_, i) => i !== idx);
        if (!options.some((o) => o.is_correct)) options[0].is_correct = true;
        return { ...q, options };
      })
    );
  }

  const isValid =
    title.trim() &&
    questions.length > 0 &&
    questions.every((q) => q.prompt.trim() && q.options.every((o) => o.text.trim()) && q.options.some((o) => o.is_correct));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/topics/${topicId}/challenges`, {
        title: title.trim(),
        difficulty,
        questions: questions.map((q) => ({
          type: "SINGLE_CHOICE",
          prompt: q.prompt.trim(),
          points: Number(q.points) || 1,
          explanation: q.explanation.trim() || undefined,
          options: q.options.map((o) => ({ text: o.text.trim(), is_correct: o.is_correct })),
        })),
      });
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ gap: 16 }}>
      <input
        className="text-input"
        placeholder="Challenge nomi"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={saving}
        autoFocus
      />

      {questions.map((q, qi) => (
        <div key={q.key} className="card" style={{ background: "var(--surface-muted)", boxShadow: "none" }}>
          <div className="toolbar-row">
            <strong>Savol {qi + 1}</strong>
            {questions.length > 1 && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
                disabled={saving}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <textarea
            className="textarea-input"
            placeholder="Savol matni"
            value={q.prompt}
            onChange={(e) => updateQuestion(q.key, { prompt: e.target.value })}
            disabled={saving}
          />
          {q.options.map((opt, oi) => (
            <div className="option-editor-row" key={oi}>
              <input
                type="radio"
                name={`correct-${q.key}`}
                checked={opt.is_correct}
                onChange={() => setCorrect(q.key, oi)}
                disabled={saving}
              />
              <input
                className="text-input"
                placeholder={`Variant ${oi + 1}`}
                value={opt.text}
                onChange={(e) => updateOption(q.key, oi, { text: e.target.value })}
                disabled={saving}
              />
              {q.options.length > 2 && (
                <button type="button" className="icon-btn" onClick={() => removeOption(q.key, oi)} disabled={saving}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          {q.options.length < 4 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addOption(q.key)} disabled={saving} style={{ alignSelf: "flex-start" }}>
              <Plus size={13} /> Variant qo'shish
            </button>
          )}
          <input
            className="text-input"
            placeholder="Izoh (ixtiyoriy) — javobdan keyin ko'rsatiladi"
            value={q.explanation}
            onChange={(e) => updateQuestion(q.key, { explanation: e.target.value })}
            disabled={saving}
          />
        </div>
      ))}

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
        disabled={saving}
        style={{ alignSelf: "flex-start" }}
      >
        <Plus size={14} /> Savol qo'shish
      </button>

      {error && <p className="field-error">{friendlyError(error)}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Bekor qilish
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !isValid}>
          {saving ? "Saqlanmoqda…" : "Challenge yaratish"}
        </button>
      </div>
    </form>
  );
}

function ChallengeRow({ challenge, onChanged }) {
  const [status, setStatus] = useState(challenge.status);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "PENDING" && status !== "PROCESSING") return undefined;
    let cancelled = false;
    async function poll() {
      try {
        const res = await api.get(`/challenges/${challenge.id}/status`);
        if (cancelled) return;
        if (res.status !== status) {
          setStatus(res.status);
          onChanged?.();
          return;
        }
      } catch {
        /* keep polling */
      }
      if (!cancelled) timer = setTimeout(poll, 1500);
    }
    let timer = setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, challenge.id]);

  async function setChallengeStatus(next) {
    setBusy(true);
    try {
      await api.patch(`/challenges/${challenge.id}/status`, { status: next });
      setStatus(next);
      onChanged?.();
    } catch (err) {
      window.alert(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="list-card" style={{ cursor: "default" }}>
      <span className="list-card-icon">
        <Target size={18} />
      </span>
      <div className="list-card-body">
        <strong>{challenge.title}</strong>
        <span className="list-card-meta">
          {challenge.question_count} savol · {challenge.difficulty} · {challenge.origin}
        </span>
      </div>
      <StatusBadge status={status} />
      {status === "READY" && (
        <button className="icon-btn" title="Arxivlash" onClick={() => setChallengeStatus("ARCHIVED")} disabled={busy}>
          <Archive size={15} />
        </button>
      )}
      {status === "ARCHIVED" && (
        <button className="icon-btn" title="Faollashtirish" onClick={() => setChallengeStatus("READY")} disabled={busy}>
          <CheckCircle2 size={15} />
        </button>
      )}
    </div>
  );
}

export default function TeacherTopicPage() {
  const { topicId } = useParams();
  const [showManualForm, setShowManualForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  const { data, loading, error, reload } = useApiData(async () => {
    const [topic, challenges, analytics] = await Promise.all([
      api.get(`/topics/${topicId}`),
      api.get(`/topics/${topicId}/challenges`),
      api.get(`/teacher/topics/${topicId}/analytics`),
    ]);
    return { topic, challenges, analytics };
  }, [topicId]);

  if (loading) return <LoadingView label="Mavzu yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  const { topic, challenges, analytics } = data;

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      await api.post(`/topics/${topicId}/challenges/generate`, { difficulty: topic.difficulty, question_count: 5 });
      reload();
    } catch (err) {
      setGenError(err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="responsive-page">
      <PageHeader title={topic.title} subtitle={topic.description} action={<DifficultyBadge difficulty={topic.difficulty} />} />

      <div className="kpi-grid">
        <KpiCard icon={<Users size={18} />} value={analytics.participants} label="Qatnashchilar" tone={{ bg: "#eaf1ff", fg: "#1d4ed8" }} />
        <KpiCard icon={<Target size={18} />} value={analytics.attempts_count} label="Urinishlar" tone={{ bg: "#ecfdf3", fg: "#15803d" }} />
        <KpiCard
          icon={<Target size={18} />}
          value={`${Math.round(analytics.average_accuracy)}%`}
          label="O'rtacha aniqlik"
          tone={{ bg: "#fffaeb", fg: "#b45309" }}
        />
        <KpiCard icon={<Target size={18} />} value={Math.round(analytics.average_score)} label="O'rtacha ball" tone={{ bg: "#fdf2ff", fg: "#a21caf" }} />
      </div>

      <div className="dashboard-grid">
        <Card title="Kuchli o'quvchilar" icon={<TrendingUp size={16} />}>
          {analytics.strongest_students?.length ? (
            analytics.strongest_students.map((s, i) => (
              <div key={i} className="list-card" style={{ cursor: "default" }}>
                <Avatar user={s.user} size={30} />
                <div className="list-card-body">
                  <strong>{s.user.display_name}</strong>
                </div>
                <span className="leader-xp">{Math.round(s.mastery_percent)}%</span>
              </div>
            ))
          ) : (
            <p className="muted">Ma'lumot yo'q.</p>
          )}
        </Card>
        <Card title="Yordam kerak bo'lganlar" icon={<TrendingDown size={16} />}>
          {analytics.students_needing_attention?.length ? (
            analytics.students_needing_attention.map((s, i) => (
              <div key={i} className="list-card" style={{ cursor: "default" }}>
                <Avatar user={s.user} size={30} />
                <div className="list-card-body">
                  <strong>{s.user.display_name}</strong>
                </div>
                <span className="leader-xp" style={{ color: "var(--danger)" }}>
                  {Math.round(s.mastery_percent)}%
                </span>
              </div>
            ))
          ) : (
            <p className="muted">Ma'lumot yo'q.</p>
          )}
        </Card>
      </div>

      <section className="section">
        <div className="toolbar-row">
          <h3 className="section-title">Challenge'lar</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowManualForm((v) => !v)}>
              <Plus size={14} /> Qo'lda yaratish
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={generating}>
              <Sparkles size={14} /> {generating ? "Yaratilmoqda…" : "AI bilan yaratish"}
            </button>
          </div>
        </div>
        {genError && <p className="field-error">{friendlyError(genError)}</p>}

        {showManualForm && (
          <ManualChallengeForm
            topicId={topicId}
            difficulty={topic.difficulty}
            onDone={() => {
              setShowManualForm(false);
              reload();
            }}
            onCancel={() => setShowManualForm(false)}
          />
        )}

        {challenges.length === 0 ? (
          <EmptyView icon={<Target size={26} />} title="Hali challenge yo'q" subtitle="AI bilan yoki qo'lda birinchi challenge'ni yarating." />
        ) : (
          challenges.map((c) => <ChallengeRow key={c.id} challenge={c} onChanged={reload} />)
        )}
      </section>
    </div>
  );
}
