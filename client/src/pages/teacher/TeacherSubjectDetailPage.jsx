import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, FolderOpen, Plus } from "lucide-react";
import { api } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { LoadingView, ErrorView, EmptyView } from "../../components/StateViews";
import { PageHeader, DifficultyBadge } from "../../components/ui";
import { friendlyError } from "../../lib/errorMessages";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

export default function TeacherSubjectDetailPage() {
  const { classId, subjectId } = useParams();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const { data: topics, loading, error, reload } = useApiData(
    () => api.get(`/subjects/${subjectId}/topics`),
    [subjectId]
  );

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api.post(`/subjects/${subjectId}/topics`, {
        title: title.trim(),
        description: description.trim() || undefined,
        difficulty,
      });
      setTitle("");
      setDescription("");
      setShowForm(false);
      reload();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingView label="Mavzular yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  return (
    <div className="responsive-page">
      <PageHeader
        title="Mavzular"
        subtitle="Fan bo'yicha mavzularni boshqaring"
        action={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/teacher/classes/${classId}`)}>
            ← Sinfga qaytish
          </button>
        }
      />

      <div className="toolbar-row">
        <p className="muted">{topics.length} ta mavzu</p>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> Mavzu qo'shish
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ gap: 10 }}>
          <input
            className="text-input"
            placeholder="Mavzu nomi (masalan: Kvadrat tenglamalar)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
            autoFocus
          />
          <textarea
            className="textarea-input"
            placeholder="Tavsif (ixtiyoriy)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
          <div className="form-grid">
            <select className="select-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={saving}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          {saveError && <p className="field-error">{friendlyError(saveError)}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !title.trim()} style={{ alignSelf: "flex-start" }}>
            {saving ? "Qo'shilmoqda…" : "Qo'shish"}
          </button>
        </form>
      )}

      {topics.length === 0 ? (
        <EmptyView icon={<FolderOpen size={26} />} title="Hali mavzu yo'q" subtitle="Birinchi mavzuni qo'shing." />
      ) : (
        <div className="topic-list">
          {topics.map((t) => (
            <button
              key={t.id}
              className="topic-card"
              style={{ width: "100%", cursor: "pointer" }}
              onClick={() => navigate(`/teacher/topics/${t.id}`)}
            >
              <div className="topic-card-main">
                <strong>{t.title}</strong>
                {t.description && <span className="topic-card-desc">{t.description}</span>}
                <div className="topic-card-meta">
                  <DifficultyBadge difficulty={t.difficulty} />
                </div>
              </div>
              <span className="chevron">
                <ChevronRight size={18} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
