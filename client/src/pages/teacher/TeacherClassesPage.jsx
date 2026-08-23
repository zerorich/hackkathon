import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, School, Users } from "lucide-react";
import { useTeacherClasses } from "../../context/TeacherClassContext";
import { LoadingView, ErrorView, EmptyView } from "../../components/StateViews";
import { PageHeader } from "../../components/ui";
import { CreateClassModal } from "../../components/CreateClassModal";

export default function TeacherClassesPage() {
  const navigate = useNavigate();
  const { classes, loading, error, reload, setActiveClassId } = useTeacherClasses();
  const [showCreate, setShowCreate] = useState(false);

  if (loading) return <LoadingView label="Sinflar yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  function openClass(c) {
    setActiveClassId(c.id);
    navigate(`/teacher/classes/${c.id}`);
  }

  return (
    <div className="responsive-page">
      <PageHeader
        title="Sinflar"
        subtitle="Sinflaringizni boshqaring va yangilarini yarating"
        action={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Sinf yaratish
          </button>
        }
      />

      {classes.length === 0 ? (
        <EmptyView
          icon={<School size={26} />}
          title="Sizda hali sinf yo'q"
          subtitle="Birinchi sinfingizni yarating."
          action={
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Sinf yaratish
            </button>
          }
        />
      ) : (
        <div className="subject-grid">
          {classes.map((c) => (
            <button key={c.id} className="subject-card" style={{ textAlign: "left" }} onClick={() => openClass(c)}>
              <span className="subject-card-icon">
                <School size={20} />
              </span>
              <strong>{c.name}</strong>
              <span className="subject-card-desc">
                <Users size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {c.grade}-sinf
              </span>
              {c.invite_code && <span className="invite-pill">{c.invite_code}</span>}
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
