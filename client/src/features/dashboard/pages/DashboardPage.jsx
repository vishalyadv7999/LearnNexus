import {
  BarChart3,
  BookOpenCheck,
  CalendarCheck,
  Flame,
  Menu,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  fetchProgressDashboard,
  fetchProgressOverview,
} from "../../../services/progressService";
import EmptyState from "../../../common/components/EmptyState";
import {
  SkillRadarChart,
  WeeklyStudyTimeGraph,
} from "../../../components/ProgressChart";
import { useAuth } from "../../../hooks/useAuth";

const formatActivityLabel = (date) =>
  new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(date));

const buildWeeklyData = (activity = []) =>
  [...activity]
    .reverse()
    .map((item) => ({
      label: formatActivityLabel(item.date),
      value: item.completionRate || 0,
    }))
    .slice(-7);

const StatCard = ({ icon: Icon, label, value, helper }) => (
  <article className="panel transition hover:-translate-y-0.5 hover:border-primary/30">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="subtle-label">{label}</p>
        <p className="mt-3 text-3xl font-black text-ink">{value}</p>
      </div>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
    </div>
    <p className="mt-4 text-sm leading-6 text-muted">{helper}</p>
  </article>
);

const ProgressList = ({ items = [] }) => (
  <section className="panel">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="subtle-label">Course progress</p>
        <h2 className="mt-2 text-2xl font-black text-ink">Subject momentum</h2>
      </div>
      <Target className="h-5 w-5 text-primary" />
    </div>

    {items.length ? (
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.subject}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-bold text-ink">{item.subject}</span>
              <span className="font-black text-primary">{item.completionRate}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.35)] transition-all duration-700"
                style={{ width: `${item.completionRate}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-semibold text-muted">
              {item.completed}/{item.total} tasks completed
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p className="mt-5 text-sm leading-6 text-muted">
        Complete lessons to unlock subject-level progress.
      </p>
    )}
  </section>
);

const InsightList = ({ title, emptyText, items = [], variant = "strength" }) => (
  <section className="panel">
    <p className="subtle-label">{title}</p>
    <div className="mt-4 space-y-3">
      {items.length ? (
        items.map((item) => (
          <div
            className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"
            key={item.subject}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{item.subject}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  variant === "strength"
                    ? "bg-primary/10 text-primary"
                    : "bg-amber-400/10 text-amber-200"
                }`}
              >
                {item.averageScore}%
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {item.attempts} quiz {item.attempts === 1 ? "attempt" : "attempts"}
            </p>
          </div>
        ))
      ) : (
        <p className="text-sm leading-6 text-muted">{emptyText}</p>
      )}
    </div>
  </section>
);

const DashboardSkeleton = () => (
  <div className="grid gap-4 lg:grid-cols-4">
    {[0, 1, 2, 3].map((item) => (
      <div
        className="h-36 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.055]"
        key={item}
      />
    ))}
    <div className="h-80 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.055] lg:col-span-2" />
    <div className="h-80 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.055] lg:col-span-2" />
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const outletContext = useOutletContext();
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadWeeklyReport = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [{ data: dashboardData }, { data: summaryData }] = await Promise.all([
          fetchProgressDashboard(),
          fetchProgressOverview(),
        ]);
        setWeeklyReport({
          ...dashboardData,
          overview: {
            ...(dashboardData.overview || {}),
            completionRate: summaryData.overallProgress,
            overallProgress: summaryData.overallProgress,
            activeDays: summaryData.activeDays,
            currentStreak: summaryData.currentStreak,
            completedTasks: summaryData.completedItems,
            totalTasks: summaryData.totalItems,
            lastActiveDate: summaryData.lastActiveDate,
          },
        });
      } catch (loadError) {
        setError(
          loadError.response?.data?.message ||
            "Unable to load your weekly report right now."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadWeeklyReport();
  }, [reloadKey]);

  const overview = weeklyReport?.overview;
  const subjectMomentum = overview?.subjectMomentum || [];
  const weeklyData = useMemo(
    () => buildWeeklyData(weeklyReport?.recentActivity || []),
    [weeklyReport?.recentActivity]
  );
  const skillData = subjectMomentum.slice(0, 6).map((item) => ({
    label: item.subject.split(" ")[0],
    value: item.completionRate,
  }));
  const completionRate = overview?.completionRate || 0;
  const completedTasks = overview?.completedTasks || 0;
  const totalTasks = overview?.totalTasks || 0;
  const activeDays = overview?.activeDays || 0;
  const streak = overview?.currentStreak || 0;

  if (error && !weeklyReport && !isLoading) {
    return (
      <div className="dashboard-shell">
        <EmptyState title="Dashboard unavailable" description={error} />
        <button className="btn-secondary mt-4" onClick={() => setReloadKey((value) => value + 1)} type="button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            aria-label="Open navigation"
            className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-2xl backdrop-blur-xl transition hover:border-primary/40 lg:hidden"
            onClick={outletContext?.openMobileSidebar}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="subtle-label">Learning dashboard</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
            Welcome back, {user?.name?.split(" ")[0] || "learner"}.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Track real progress from your lessons, quizzes, and daily study plan.
          </p>
        </div>
        <Link className="btn-primary self-start lg:self-auto" to="/study-plan">
          <BookOpenCheck className="h-4 w-4" />
          Continue Learning
        </Link>
      </header>

      <div className="mt-8">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-6">
            {error ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
                <span>{error}</span>
                <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setReloadKey((value) => value + 1)} type="button">
                  Retry
                </button>
              </div>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                helper={`${completedTasks}/${totalTasks} tasks completed`}
                icon={BarChart3}
                label="Overall progress"
                value={`${completionRate}%`}
              />
              <StatCard
                helper="Days with completed learning activity"
                icon={CalendarCheck}
                label="Active days"
                value={activeDays}
              />
              <StatCard
                helper="Current consecutive learning streak"
                icon={Flame}
                label="Current streak"
                value={streak}
              />
              <StatCard
                helper="Generated from your saved study plans"
                icon={BookOpenCheck}
                label="Study plans"
                value={overview?.totalStudyPlans || 0}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <WeeklyStudyTimeGraph data={weeklyData} />
              <ProgressList items={subjectMomentum} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <SkillRadarChart skills={skillData} />
              <div className="grid gap-6 md:grid-cols-2">
                <InsightList
                  emptyText="Complete quizzes with scores above 75% to surface strengths."
                  items={overview?.strengths || []}
                  title="Strengths"
                />
                <InsightList
                  emptyText="No weak areas detected yet."
                  items={overview?.weaknesses || []}
                  title="Needs revision"
                  variant="revision"
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
