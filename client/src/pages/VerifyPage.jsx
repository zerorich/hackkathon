import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { friendlyError } from "../lib/errorMessages";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function VerifyPage() {
  const { verifyOtp, requestOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const identifier = location.state?.identifier;
  const [demoCode, setDemoCode] = useState(location.state?.demoCode);
  const password = location.state?.password;
  const role = location.state?.role;

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!identifier) {
    return <Navigate to="/login" replace />;
  }

  function updateDigit(idx, val) {
    if (!/^\d?$/.test(val)) return;
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
    if (val && idx < CODE_LENGTH - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!text) return;
    e.preventDefault();
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => text[i] || ""));
    inputsRef.current[Math.min(text.length, CODE_LENGTH - 1)]?.focus();
  }

  async function handleVerify(e) {
    e?.preventDefault();
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(identifier, code, { password, role });
      if (!res.user.onboarding_completed) {
        navigate("/onboarding", { replace: true });
      } else if (res.user.role === "TEACHER") {
        navigate("/teacher/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await requestOtp(identifier);
      setDemoCode(res?.demo_code || null);
      setDigits(Array(CODE_LENGTH).fill(""));
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err);
    } finally {
      setResending(false);
    }
  }

  const code = digits.join("");

  return (
    <div className="theme-guest">
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark">
            <ShieldCheck size={26} />
          </div>
          <h1>Kodni kiriting</h1>
          <p className="auth-tagline">{identifier} manziliga 6 xonali kod yuborildi</p>
          {demoCode && <p className="demo-hint">Demo rejim — kod: {demoCode}</p>}

          <form onSubmit={handleVerify} className="auth-form">
            <div className="otp-inputs" onPaste={handlePaste}>
              {digits.map((d, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputsRef.current[idx] = el)}
                  className="otp-box"
                  inputMode="numeric"
                  aria-label={`Kod raqami ${idx + 1}`}
                  autoComplete={idx === 0 ? "one-time-code" : "off"}
                  autoFocus={idx === 0}
                  maxLength={1}
                  value={d}
                  onChange={(e) => updateDigit(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={loading}
                />
              ))}
            </div>
            {error && <p className="field-error center">{friendlyError(error)}</p>}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading || code.length !== CODE_LENGTH}
            >
              {loading ? "Tekshirilmoqda…" : "Tasdiqlash"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
            >
              {resending
                ? "Yuborilmoqda…"
                : cooldown > 0
                  ? `Kodni qayta yuborish (${cooldown}s)`
                  : "Kodni qayta yuborish"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
