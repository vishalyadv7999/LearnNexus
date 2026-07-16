import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { getAuthErrorMessage } from "../../../utils/authErrors";

const LoginPage = () => {
  const {
    login,
    verifySignup,
    resendSignupCode,
    forgotPassword,
    authNotice,
    consumeAuthNotice,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: "",
    password: "",
    verificationCode: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const message = consumeAuthNotice?.() || authNotice;

    if (message) {
      setNotice(message);
    }
  }, [authNotice, consumeAuthNotice]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setDevResetUrl("");

    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/home", { replace: true });
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, "Login failed."));
      if (submitError.response?.status === 403) {
        setShowEmailConfirm(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmEmail = async () => {
    setError("");
    setNotice("");
    setDevResetUrl("");

    if (!/^\d{6}$/.test(form.verificationCode.trim())) {
      setError("Enter the 6-digit verification code sent to your email.");
      return;
    }

    setIsSubmitting(true);

    try {
      await verifySignup({
        email: form.email.trim(),
        code: form.verificationCode.trim(),
      });
      navigate("/home", { replace: true });
    } catch (submitError) {
      setError(
        getAuthErrorMessage(
          submitError,
          "Email confirmation failed. Please check the code."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setNotice("");
    setDevResetUrl("");
    setIsSubmitting(true);

    try {
      const response = await resendSignupCode({ email: form.email.trim() });
      setShowEmailConfirm(true);
      setNotice(
        response.devVerificationCode
          ? `${response.message} Dev code: ${response.devVerificationCode}`
          : response.message || "A new verification code was sent."
      );
    } catch (submitError) {
      setError(
        getAuthErrorMessage(
          submitError,
          "We couldn't send a verification code right now."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setNotice("");
    setDevResetUrl("");

    if (!form.email.trim()) {
      setError("Enter your email first so we can send a reset link.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await forgotPassword({ email: form.email.trim() });
      setNotice(response.message || "Password reset link sent.");
      setDevResetUrl(response.devResetUrl || "");
    } catch (submitError) {
      setError(
        getAuthErrorMessage(
          submitError,
          "We couldn't start account recovery right now."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const devResetPath = devResetUrl
    ? `${new URL(devResetUrl).pathname}${new URL(devResetUrl).search}`
    : "";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center border-b border-line px-6 py-10 lg:border-b-0 lg:border-r lg:px-12">
        <div className="mx-auto max-w-xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            Focused learning, one day at a time
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
              Your daily study system should feel clear, not chaotic.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted">
              LearnNexus turns your course and year into a structured study plan
              with guided videos, notes, practice work, and progress you can
              actually trust.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel">
              <p className="subtle-label">Structured</p>
              <p className="mt-3 text-lg font-bold text-ink">Daily tasks</p>
            </div>
            <div className="panel">
              <p className="subtle-label">Adaptive</p>
              <p className="mt-3 text-lg font-bold text-ink">Year-based difficulty</p>
            </div>
            <div className="panel">
              <p className="subtle-label">Supportive</p>
              <p className="mt-3 text-lg font-bold text-ink">Built-in doubt solver</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center px-6 py-10 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <form className="panel space-y-5" onSubmit={handleSubmit}>
            <div>
              <p className="subtle-label">Welcome back</p>
              <h2 className="mt-2 text-3xl font-extrabold text-ink">
                Log in to continue
              </h2>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Email</span>
              <input
                className="field"
                name="email"
                onChange={handleChange}
                placeholder="student@example.com"
                type="email"
                value={form.email}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Password</span>
              <input
                className="field"
                name="password"
                onChange={handleChange}
                placeholder="Enter your password"
                type="password"
                value={form.password}
                required
              />
            </label>

            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            {notice ? <p className="text-sm font-medium text-primary">{notice}</p> : null}
            {devResetUrl ? (
              <Link className="break-all text-sm font-semibold text-primary" to={devResetPath}>
                Open local reset link
              </Link>
            ) : null}

            {showEmailConfirm ? (
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-ink">
                    Confirm email code
                  </span>
                  <input
                    className="field tracking-[0.3em]"
                    inputMode="numeric"
                    maxLength={6}
                    name="verificationCode"
                    onChange={handleChange}
                    placeholder="123456"
                    value={form.verificationCode}
                  />
                </label>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    className="btn-secondary"
                    disabled={isSubmitting}
                    onClick={handleConfirmEmail}
                    type="button"
                  >
                    Confirm Email
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={isSubmitting || !form.email}
                    onClick={handleResendCode}
                    type="button"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            ) : null}

            <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
              <ArrowRight className="h-4 w-4" />
              {isSubmitting ? "Logging in..." : "Log In"}
            </button>

            <p className="text-sm text-muted">
              Need an account?{" "}
              <Link className="font-semibold text-primary" to="/signup">
                Create one
              </Link>
            </p>
            {!showEmailConfirm ? (
              <div className="flex flex-wrap gap-3">
                <button
                  className="text-left text-sm font-semibold text-primary"
                  disabled={isSubmitting || !form.email}
                  onClick={handleResendCode}
                  type="button"
                >
                  Confirm email or resend code
                </button>
                <button
                  className="text-left text-sm font-semibold text-primary"
                  disabled={isSubmitting || !form.email}
                  onClick={handleForgotPassword}
                  type="button"
                >
                  Forgot password?
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
