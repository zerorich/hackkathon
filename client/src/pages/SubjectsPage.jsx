import { Link } from "react-router-dom";
import { BookOpen, Layers } from "lucide-react";
import { api } from "../lib/api";
import { useApiData } from "../lib/useApiData";
import { LoadingView, ErrorView, EmptyView } from "../components/StateViews";
import { PageHeader } from "../components/ui";

async function loadSubjects() {
  const classes = await api.get("/classes");
  const activeClass = classes?.[0];
  if (!activeClass) return { class: null, subjects: [] };
  const subjects = await api.get(`/classes/${activeClass.id}/subjects`);
  return { class: activeClass, subjects };
}

export default function SubjectsPage() {
  const { data, loading, error, reload } = useApiData(loadSubjects, []);

  if (loading) return <LoadingView label="Fanlar yuklanmoqda…" />;
  if (error) return <ErrorView error={error} onRetry={reload} />;

  if (!data.class) {
    return (
      <div className="page">
        <PageHeader title="Fanlar" />
        <EmptyView
          icon={<Layers size={26} />}
          title="Siz hali sinfda emassiz"
          subtitle="Fanlarni ko'rish uchun sinfga qo'shiling."
          action={
            <Link className="btn btn-primary" to="/join">
              Sinfga qo'shilish
            </Link>
          }
        />
      </div>
    );
  }

  if (!data.subjects.length) {
    return (
      <div className="page">
        <PageHeader title="Fanlar" subtitle={data.class.name} />
        <EmptyView icon={<BookOpen size={26} />} title="Hali fanlar yo'q" subtitle="O'qituvchingiz hali fan qo'shmagan." />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Fanlar" subtitle={data.class.name} />
      <div className="subject-grid">
        {data.subjects.map((s) => (
          <Link key={s.id} to={`/subjects/${s.id}`} state={{ subject: s }} className="subject-card">
            <span className="subject-card-icon">
              <BookOpen size={20} />
            </span>
            <strong>{s.name}</strong>
            {s.description && <span className="subject-card-desc">{s.description}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
