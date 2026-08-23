import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearTokens, getAccessToken, setTokens, setUnauthorizedHandler } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  const loadMe = useCallback(async () => {
    try {
      const me = await api.get("/auth/me");
      setUser(me);
      setStatus("authenticated");
      return me;
    } catch {
      clearTokens();
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("unauthenticated");
    });
    if (getAccessToken()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session check on mount
      loadMe();
    } else {
      setStatus("unauthenticated");
    }
  }, [loadMe]);

  const requestOtp = useCallback(
    (identifier) => api.post("/auth/otp/request", { identifier }, { auth: false }),
    []
  );

  const verifyOtp = useCallback(async (identifier, code, { password, role } = {}) => {
    const data = await api.post(
      "/auth/otp/verify",
      { identifier, code, password, role },
      { auth: false }
    );
    setTokens(data);
    setUser(data.user);
    setStatus("authenticated");
    return data;
  }, []);

  const loginWithPassword = useCallback(async (identifier, password) => {
    const data = await api.post("/auth/login", { identifier, password }, { auth: false });
    setTokens(data);
    setUser(data.user);
    setStatus("authenticated");
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      /* proceed with local logout regardless */
    }
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const updateProfile = useCallback(async (body) => {
    const updated = await api.patch("/auth/me", body);
    setUser(updated);
    return updated;
  }, []);

  const value = {
    user,
    status,
    requestOtp,
    verifyOtp,
    loginWithPassword,
    logout,
    updateProfile,
    refreshUser: loadMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
