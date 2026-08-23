import { ChevronDown, School } from "lucide-react";
import { useTeacherClasses } from "../context/TeacherClassContext";

export function ClassSwitcher() {
  const { classes, activeClassId, setActiveClassId } = useTeacherClasses();

  if (!classes || classes.length === 0) return null;

  return (
    <label className="class-switcher">
      <School size={16} />
      <select
        value={activeClassId || ""}
        onChange={(e) => setActiveClassId(e.target.value)}
        style={{ border: "none", background: "transparent", font: "inherit", fontWeight: 700, color: "inherit" }}
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {c.grade}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}
