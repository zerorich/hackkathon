import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ChevronRight, Clock3, Sparkles, Target } from "lucide-react";
import { api } from "../lib/api";
import { useApiData } from "../lib/useApiData";
import { LoadingView, ErrorView } from "../components/StateViews";
import { PageHeader, DifficultyBadge, MasteryBadge, ProgressBar } from "../components/ui";
import { friendlyError } from "../lib/errorMessages";

export default function TopicDetailPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  const { data, loading, error, reload } = useApiData(async () => {
    const [topic, challenges, attempts] = await Promise.all([
      api.get(`/topics/${topicId}`),
      api.get(`/topics/${topicId}/challenges`),
      api.get(`/me/attempts?topic_id=${topicId}&limit=5`),
    ]);
    return { topic, challenges, attempts: attempts.items };
  }, [topicId]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await api.post(`/topics/${topicId}/challenges/generate`, {
        question_count: 5,
      });
      navigate(`/challenge/${res.challenge_id}`);
    } catch (err) {
      setGenError(err);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <LoadingView label="Mavzu yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  const { topic, challenges, attempts } = data;
  const readyChallenges = challenges.filter((c) => c.status === "READY");

  return (
    <div className="page">
      <PageHeader title={topic.title} subtitle={topic.description} />

      <div className="topic-summary">
        <DifficultyBadge difficulty={topic.difficulty} />
        {topic.mastery_category && <MasteryBadge category={topic.mastery_category} />}
        {typeof topic.attempts_count === "number" && <span className="muted">{topic.attempts_count} urinish</span>}
      </div>
      {typeof topic.mastery_percent === "number" && (
        <div className="level-progress">
          <ProgressBar value={topic.mastery_percent} max={100} tone="accent" />
          <span className="level-progress-label">{Math.round(topic.mastery_percent)}% o'zlashtirilgan</span>
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={handleGenerate} disabled={generating}>
        <Sparkles size={16} /> {generating ? "Boshlanmoqda…" : "AI Challenge yaratish"}
      </button>
      {genError && <p className="field-error">{friendlyError(genError)}</p>}

      {readyChallenges.length > 0 && (
        <section className="section">
          <h3 className="section-title">Mashq qilishga tayyor</h3>
          {readyChallenges.map((c) => (
            <button
              key={c.id}
              className="list-card list-card-button"
              onClick={() => navigate(`/challenge/${c.id}`)}
            >
              <span className="list-card-icon">
                <Target size={18} />
              </span>
              <div className="list-card-body">
                <strong>{c.title}</strong>
                <span className="list-card-meta">
                  {c.question_count} savol · {c.difficulty}
                </span>
              </div>
              <span className="chevron">
                <ChevronRight size={18} />
              </span>
            </button>
          ))}
        </section>
      )}

      {attempts.length > 0 && (
        <section className="section">
          <h3 className="section-title">So'nggi urinishlar</h3>
          {attempts.map((a) => (
            <div key={a.id} className="list-card" style={{ cursor: "default" }}>
              <span className="list-card-icon">
                {a.status === "COMPLETED" ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
              </span>
              <div className="list-card-body">
                <strong>
                  {a.status === "COMPLETED" ? `${a.correct_count}/${a.total_questions} to'g'ri` : "Davom etmoqda"}
                </strong>
                {a.status === "COMPLETED" && <span className="list-card-meta">Ball: {a.score}</span>}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
