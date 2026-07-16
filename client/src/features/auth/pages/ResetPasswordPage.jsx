import { ArrowRight, KeyRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { getAuthErrorMessage } from "../../../utils/authErrors";

const ResetPasswordPage = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasResetLink = Boolean(email && token);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!hasResetLink) {
      setError("Password reset link is invalid or expired.");
      return;
    }

    if (!form.password || !form.confirmPassword) {
      setError("Enter and confirm your new password.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({
        email,
        token,
        password: form.password,
      });
      navigate("/login", {
        replace: true,
        state: {
          notice: response.message || "Password reset successful. Please log in.",
        },
      });
    } catch (submitError) {
      setError(
        getAuthErrorMessage(
          submitError,
          "Password reset failed. Please request a new link."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-6 py-10">
      <form className="panel w-full max-w-md space-y-5" onSubmit={handleSubmit}>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          <KeyRound className="h-4 w-4" />
          Password recovery
        </div>
        <div>
          <p className="subtle-label">Secure reset</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">
            Create a new password
          </h1>
        </div>

        {!hasResetLink ? (
          <p className="text-sm font-medium text-red-600">
            Password reset link is invalid or expired.
          </p>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">Email</span>
          <input className="field" disabled type="email" value={email} />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">New password</span>
          <input
            className="field"
            name="password"
            onChange={handleChange}
            placeholder="Use uppercase, lowercase, and a number"
            type="password"
            value={form.password}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">Confirm password</span>
          <input
            className="field"
            name="confirmPassword"
            onChange={handleChange}
            placeholder="Confirm your new password"
            type="password"
            value={form.confirmPassword}
            required
          />
        </label>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <button
          className="btn-primary w-full"
          disabled={isSubmitting || !hasResetLink}
          type="submit"
        >
          <ArrowRight className="h-4 w-4" />
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>

        <p className="text-sm text-muted">
          Need a new link?{" "}
          <Link className="font-semibold text-primary" to="/login">
            Go back to login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
