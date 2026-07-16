import { ArrowRight, BookMarked } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCourses } from "../api/auth";
import { useAuth } from "../../../hooks/useAuth";
import { getAuthErrorMessage } from "../../../utils/authErrors";
import { fallbackCourseGroups, groupCourses } from "../../../utils/courseCatalog";

const initialForm = {
  name: "",
  email: "",
  password: "",
  course: "",
  year: "1",
  verificationCode: "",
};

const SignupPage = () => {
  const { signup, verifySignup, resendSignupCode } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
  const [courseGroups, setCourseGroups] = useState(fallbackCourseGroups);
  const [courseNote, setCourseNote] = useState("");
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const { data } = await fetchCourses();
        setCourseGroups(groupCourses(data.courses));
        setCourseNote("");
      } catch (_error) {
        setCourseGroups(fallbackCourseGroups);
        setCourseNote(
          "Showing the available course list locally. Account creation still needs the backend and database to be running."
        );
      } finally {
        setIsLoadingCourses(false);
      }
    };

    loadCourses();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (isAwaitingVerification) {
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
        setError(getAuthErrorMessage(submitError, "Verification failed. Please check the code and try again."));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (!form.course) {
      setError("Please select your career field from the list.");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Complete all required fields before creating your account.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await signup({
        name: form.name,
        email: form.email.trim(),
        password: form.password,
        course: form.course,
        year: Number(form.year),
      });
      setIsAwaitingVerification(true);
      setNotice(
        response.devVerificationCode
          ? `${response.message} Dev code: ${response.devVerificationCode}`
          : response.message || "Verification code sent. Check your email."
      );
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, "Signup failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await resendSignupCode({ email: form.email.trim() });
      setNotice(
        response.devVerificationCode
          ? `${response.message} Dev code: ${response.devVerificationCode}`
          : response.message || "A new verification code was sent."
      );
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, "We couldn't send a new code right now."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <section className="flex items-center border-b border-line px-6 py-10 lg:border-b-0 lg:border-r lg:px-12">
        <div className="mx-auto max-w-xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
            <BookMarked className="h-4 w-4" />
            Personal plan generation starts on day one
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
              Build a study rhythm that keeps getting smarter.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted">
              Register once, choose your course and year, and LearnNexus will
              generate structured daily tasks with the right level of challenge.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel">
              <p className="subtle-label">Daily plan</p>
              <p className="mt-3 text-lg font-bold text-ink">
                Videos, notes, and practice
              </p>
            </div>
            <div className="panel">
              <p className="subtle-label">Progress tracking</p>
              <p className="mt-3 text-lg font-bold text-ink">
                Completion stats and streaks
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center px-6 py-10 lg:px-12">
        <div className="mx-auto w-full max-w-xl">
          <form className="panel grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="sm:col-span-2">
              <p className="subtle-label">Create account</p>
              <h2 className="mt-2 text-3xl font-extrabold text-ink">
                Start your learning workspace
              </h2>
            </div>

            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-ink">Full Name</span>
              <input
                className="field"
                disabled={isAwaitingVerification}
                name="name"
                onChange={handleChange}
                placeholder="Aarav Sharma"
                value={form.name}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Email</span>
              <input
                className="field"
                disabled={isAwaitingVerification}
                name="email"
                onChange={handleChange}
                placeholder="student@example.com"
                type="email"
                value={form.email}
                required
              />
            </label>

            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-ink">
                Career field
              </span>
              <select
                className="field"
                disabled={isLoadingCourses || isAwaitingVerification}
                name="course"
                onChange={handleChange}
                value={form.course}
                required
              >
                <option value="">
                  {isLoadingCourses ? "Loading fields..." : "Select your field"}
                </option>
                {courseGroups.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            {courseNote ? (
              <p className="text-sm text-amber-700 sm:col-span-2">{courseNote}</p>
            ) : null}

            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-ink">Password</span>
              <input
                className="field"
                disabled={isAwaitingVerification}
                name="password"
                onChange={handleChange}
                placeholder="Use at least 8 characters with uppercase, lowercase, and a number"
                type="password"
                value={form.password}
                required
              />
            </label>

            {isAwaitingVerification ? (
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-ink">
                  Email verification code
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
            ) : null}

            {error ? (
              <p className="text-sm font-medium text-red-600 sm:col-span-2">
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="text-sm font-medium text-primary sm:col-span-2">
                {notice}
              </p>
            ) : null}

            <button className="btn-primary w-full sm:col-span-2" disabled={isSubmitting} type="submit">
              <ArrowRight className="h-4 w-4" />
              {isSubmitting
                ? isAwaitingVerification
                  ? "Verifying..."
                  : "Sending code..."
                : isAwaitingVerification
                  ? "Verify & Create Account"
                  : "Send Verification Code"}
            </button>

            {isAwaitingVerification ? (
              <button
                className="btn-secondary w-full sm:col-span-2"
                disabled={isSubmitting}
                onClick={handleResendCode}
                type="button"
              >
                Resend Code
              </button>
            ) : null}

            <p className="text-sm text-muted sm:col-span-2">
              Already registered?{" "}
              <Link className="font-semibold text-primary" to="/login">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
};

export default SignupPage;
