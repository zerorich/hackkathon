import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const TeacherClassContext = createContext(null);
const ACTIVE_CLASS_KEY = "zehna_active_class_id";

export function TeacherClassProvider({ children }) {
  const [classes, setClasses] = useState(null);
  const [activeClassId, setActiveClassIdState] = useState(() => localStorage.getItem(ACTIVE_CLASS_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/classes/");
      const nextClasses = Array.isArray(res) ? res : [];
      setClasses(nextClasses);
      setActiveClassIdState((prev) => {
        if (prev && nextClasses.some((c) => c.id === prev)) return prev;
        const next = nextClasses[0]?.id || null;
        if (next) localStorage.setItem(ACTIVE_CLASS_KEY, next);
        else localStorage.removeItem(ACTIVE_CLASS_KEY);
        return next;
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, [load]);

  const setActiveClassId = useCallback((id) => {
    setActiveClassIdState(id);
    if (id) localStorage.setItem(ACTIVE_CLASS_KEY, id);
    else localStorage.removeItem(ACTIVE_CLASS_KEY);
  }, []);

  const activeClass = useMemo(
    () => classes?.find((c) => c.id === activeClassId) || null,
    [classes, activeClassId]
  );

  const value = {
    classes,
    activeClassId,
    activeClass,
    setActiveClassId,
    loading,
    error,
    reload: load,
  };

  return <TeacherClassContext.Provider value={value}>{children}</TeacherClassContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useTeacherClasses() {
  const ctx = useContext(TeacherClassContext);
  if (!ctx) throw new Error("useTeacherClasses must be used within TeacherClassProvider");
  return ctx;
}
