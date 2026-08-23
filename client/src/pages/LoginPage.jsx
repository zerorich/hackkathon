import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, KeyRound, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { friendlyError } from "../lib/errorMessages";
import { buildTeacherIdentifier, teacherHandle } from "../lib/identifier";
import { ApiError } from "../lib/api";

export default function LoginPage() {
  const { requestOtp, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("login"); // login | register
  const [role, setRole] = useState(location.state?.role === "teacher" ? "teacher" : "student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordNotSet, setPasswordNotSet] = useState(false);

  const trimmed = identifier.trim();
  const isRegister = mode === "register";
  const normalizedIdentifier =
    role === "teacher" ? buildTeacherIdentifier(teacherHandle(trimmed.toLowerCase())) : trimmed;
  const canSubmit =
    (role === "teacher" ? trimmed.length >= 2 : trimmed.length >= 3) && password.length >= 4;

  function switchMode(next) {
    setMode(next);
    setError(null);
    setPasswordNotSet(false);
  }

  function switchRole(next) {
    setRole(next);
    setIdentifier("");
    setError(null);
    setPasswordNotSet(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setPasswordNotSet(false);
    try {
      const res = await loginWithPassword(normalizedIdentifier, password);
      navigate(res.user.role === "TEACHER" ? "/teacher/dashboard" : "/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "PASSWORD_NOT_SET") {
        setPasswordNotSet(true);
      }
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!canSubmit) return;
    const finalIdentifier = normalizedIdentifier;
    setLoading(true);
    setError(null);
    try {
      const res = await requestOtp(finalIdentifier);
      navigate("/verify", {
        state: { identifier: finalIdentifier, demoCode: res?.demo_code, password, role: role.toUpperCase() },
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeLogin() {
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await requestOtp(normalizedIdentifier);
      navigate("/verify", { state: { identifier: normalizedIdentifier, demoCode: res?.demo_code } });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="theme-guest">
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark">
            <Sparkles size={26} />
          </div>
          <h1>Zehn AI</h1>
          <p className="auth-tagline">
            {isRegister
              ? "O'zingizga login va parol o'ylab toping — bu safar bir martalik kod so'raladi."
              : "Login va parolingiz bilan kiring."}
          </p>

          <div className="role-tabs" aria-label="Hisob turi">
            <button
              type="button"
              className={`role-tab${role === "student" ? " active-student" : ""}`}
              onClick={() => switchRole("student")}
            >
              <UserRound size={16} /> O'quvchi
            </button>
            <button
              type="button"
              className={`role-tab${role === "teacher" ? " active-teacher" : ""}`}
              onClick={() => switchRole("teacher")}
            >
              <GraduationCap size={16} /> O'qituvchi
            </button>
          </div>

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="auth-form">
            {role === "teacher" ? (
              <>
                <label className="field-label" htmlFor="identifier">
                  O'qituvchi logini
                </label>
                <div className="prefixed-input">
                  <span className="prefix-chip">teacher@</span>
                  <input
                    id="identifier"
                    type="text"
                    placeholder="masalan: javodbek"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </>
            ) : (
              <>
                <label className="field-label" htmlFor="identifier">
                  Login (email yoki telefon)
                </label>
                <input
                  id="identifier"
                  className="text-input"
                  type="text"
                  autoComplete="username"
                  placeholder="siz@maktab.uz"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </>
            )}

            <label className="field-label" htmlFor="password">
              Parol
            </label>
            <input
              id="password"
              className="text-input"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            {error && <p className="field-error">{friendlyError(error)}</p>}
            {passwordNotSet && (
              <button type="button" className="btn btn-secondary btn-block" onClick={handleCodeLogin} disabled={loading}>
                <KeyRound size={15} /> Kod orqali kirish
              </button>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading || !canSubmit}>
              {loading ? "Yuborilmoqda…" : isRegister ? "Kod yuborish" : "Kirish"}
            </button>

            <p className="field-hint center">
              {isRegister ? (
                <>
                  Hisobingiz bormi?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); switchMode("login"); }}>
                    Kirish
                  </a>
                </>
              ) : (
                <>
                  Hisobingiz yo'qmi?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); switchMode("register"); }}>
                    Ro'yxatdan o'ting
                  </a>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
