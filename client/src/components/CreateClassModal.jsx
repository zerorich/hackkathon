import { useState } from "react";
import { api } from "../lib/api";
import { friendlyError } from "../lib/errorMessages";
import { useTeacherClasses } from "../context/TeacherClassContext";

export function CreateClassModal({ onClose, onCreated }) {
  const { reload, setActiveClassId } = useTeacherClasses();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !grade.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/classes/", {
        name: name.trim(),
        grade: grade.trim(),
        description: description.trim() || undefined,
      });
      await reload();
      setActiveClassId(res.id);
      setCreated(res);
      onCreated?.(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {created ? (
          <>
            <h3>Sinf yaratildi 🎉</h3>
            <p className="muted">O'quvchilarga shu kodni ulashing:</p>
            <div className="invite-pill">{created.invite_code}</div>
            <button className="btn btn-primary btn-block" onClick={onClose}>
              Tayyor
            </button>
          </>
        ) : (
          <>
            <h3>Yangi sinf yaratish</h3>
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="field-label">Nomi</label>
              <input
                className="text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="masalan: 9A"
                disabled={loading}
                autoFocus
              />
              <label className="field-label">Sinf (grade)</label>
              <input
                className="text-input"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="masalan: 9"
                disabled={loading}
              />
              <label className="field-label">Tavsif (ixtiyoriy)</label>
              <textarea
                className="textarea-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
              {error && <p className="field-error">{friendlyError(error)}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || !name.trim() || !grade.trim()}>
                  {loading ? "Yaratilmoqda…" : "Yaratish"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
