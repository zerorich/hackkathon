import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, ChevronRight, Copy, Plus, Trash2, Users } from "lucide-react";
import { api } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { LoadingView, ErrorView, EmptyView } from "../../components/StateViews";
import { Avatar, PageHeader } from "../../components/ui";
import { friendlyError } from "../../lib/errorMessages";

function StudentsTab({ classId }) {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApiData(
    () => api.get(`/teacher/classes/${classId}/students`),
    [classId]
  );
  const [removing, setRemoving] = useState(null);

  if (loading) return <LoadingView label="O'quvchilar yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  async function handleRemove(userId) {
    setRemoving(userId);
    try {
      await api.del(`/classes/${classId}/members/${userId}`);
      reload();
    } catch (err) {
      window.alert(friendlyError(err));
    } finally {
      setRemoving(null);
    }
  }

  if (data.length === 0) {
    return <EmptyView icon={<Users size={26} />} title="Hali o'quvchi yo'q" subtitle="Taklif kodini o'quvchilarga ulashing." />;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>O'quvchi</th>
            <th>XP</th>
            <th>Daraja</th>
            <th>Streak</th>
            <th>Yakunlangan</th>
            <th>Aniqlik</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr key={s.user.id} className="clickable" onClick={() => navigate(`/teacher/classes/${classId}/students/${s.user.id}`)}>
              <td>
                <div className="table-user-cell">
                  <Avatar user={s.user} size={30} />
                  {s.user.display_name}
                </div>
              </td>
              <td>{s.total_xp}</td>
              <td>{s.level}</td>
              <td>{s.streak}</td>
              <td>{s.completed_challenges}</td>
              <td>{Math.round(s.average_accuracy)}%</td>
              <td>
                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`${s.user.display_name}ni sinfdan chiqarasizmi?`)) handleRemove(s.user.id);
                  }}
                  disabled={removing === s.user.id}
                  title="Sinfdan chiqarish"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubjectsTab({ classId }) {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApiData(
    () => api.get(`/classes/${classId}/subjects`),
    [classId]
  );
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  if (loading) return <LoadingView label="Fanlar yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api.post(`/classes/${classId}/subjects`, { name: name.trim(), description: description.trim() || undefined });
      setName("");
      setDescription("");
      setShowForm(false);
      reload();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="section">
      <div className="toolbar-row">
        <p className="muted">{data.length} ta fan</p>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> Fan qo'shish
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ gap: 10 }}>
          <input
            className="text-input"
            placeholder="Fan nomi (masalan: Matematika)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            autoFocus
          />
          <input
            className="text-input"
            placeholder="Tavsif (ixtiyoriy)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
          {saveError && <p className="field-error">{friendlyError(saveError)}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !name.trim()} style={{ alignSelf: "flex-start" }}>
            {saving ? "Qo'shilmoqda…" : "Qo'shish"}
          </button>
        </form>
      )}

      {data.length === 0 ? (
        <EmptyView icon={<BookOpen size={26} />} title="Hali fan yo'q" subtitle="Birinchi fanni qo'shing." />
      ) : (
        <div className="topic-list">
          {data.map((s) => (
            <button
              key={s.id}
              className="topic-card"
              style={{ width: "100%", cursor: "pointer" }}
              onClick={() => navigate(`/teacher/classes/${classId}/subjects/${s.id}`)}
            >
              <div className="topic-card-main">
                <strong>{s.name}</strong>
                {s.description && <span className="topic-card-desc">{s.description}</span>}
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

export default function TeacherClassDetailPage() {
  const { classId } = useParams();
  const [tab, setTab] = useState("students");

  const { data: schoolClass, loading, error, reload } = useApiData(
    () => api.get(`/classes/${classId}`),
    [classId]
  );

  if (loading) return <LoadingView label="Sinf yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(schoolClass.invite_code);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <div className="responsive-page">
      <PageHeader
        title={schoolClass.name}
        subtitle={`${schoolClass.grade}-sinf${schoolClass.description ? " · " + schoolClass.description : ""}`}
        action={
          schoolClass.invite_code && (
            <button className="invite-pill" onClick={copyInvite} style={{ border: "none", cursor: "pointer" }}>
              <Copy size={14} /> {schoolClass.invite_code}
            </button>
          )
        }
      />

      <div className="segment-tabs">
        <button className={`segment-tab${tab === "students" ? " active" : ""}`} onClick={() => setTab("students")}>
          O'quvchilar
        </button>
        <button className={`segment-tab${tab === "subjects" ? " active" : ""}`} onClick={() => setTab("subjects")}>
          Fanlar
        </button>
      </div>

      {tab === "students" ? <StudentsTab classId={classId} /> : <SubjectsTab classId={classId} />}
    </div>
  );
}
