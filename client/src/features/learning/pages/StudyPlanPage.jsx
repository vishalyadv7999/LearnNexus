import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ListChecks,
  PlayCircle,
  Route,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  completeStudyPlanTask,
  updateTaskProgress,
} from "../../../services/progressService";
import { fetchStudyPlan } from "../api/tasks";
import EmptyState from "../../../common/components/EmptyState";
import ProgressBar from "../../../common/components/ProgressBar";
import TaskCard from "../components/TaskCard";
import { useAuth } from "../../../hooks/useAuth";
import { formatStudyDate, toInputDate } from "../../../utils/format";

const LearningRow = ({ emptyText, items = [], title, type = "video" }) => (
  <section className="panel">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="subtle-label">{title}</p>
        <h2 className="mt-1 text-xl font-black text-ink">
          {type === "playlist" ? "Recommended playlists" : "Pick up your path"}
        </h2>
      </div>
      {type === "playlist" ? (
        <ListChecks className="h-5 w-5 text-primary" />
      ) : (
        <PlayCircle className="h-5 w-5 text-primary" />
      )}
    </div>

    {items.length ? (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            className="rounded-2xl border border-white/10 bg-white/[0.055] p-4"
            key={item.youtubeVideoId || item.playlistId || item.title}
          >
            <div className="flex gap-3">
              {item.thumbnail ? (
                <img
                  alt=""
                  className="h-16 w-24 rounded-xl object-cover"
                  loading="lazy"
                  src={item.thumbnail}
                />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-white/10">
                  <PlayCircle className="h-6 w-6 text-white/45" />
                </div>
              )}
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-black text-ink">
                  {item.title}
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-muted">
                  {item.creatorName || item.subjectName}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.subjectName ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {item.subjectName}
                    </span>
                  ) : null}
                  {item.language ? (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-ink">
                      {item.language}
                    </span>
                  ) : null}
                  {item.totalLectures ? (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-ink">
                      {item.totalLectures} lectures
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            {typeof item.percent === "number" && item.percent > 0 ? (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">
                  Resume at {item.percent}%
                </p>
              </div>
            ) : null}
            {item.reason ? (
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted">
                {item.reason}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    ) : (
      <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-muted">
        {emptyText}
      </div>
    )}
  </section>
);

const RoadmapPanel = ({ roadmap }) => {
  if (!roadmap) {
    return null;
  }

  return (
    <aside className="panel space-y-5">
      <div className="flex items-center gap-2">
        <Route className="h-5 w-5 text-primary" />
        <div>
          <p className="subtle-label">Complete this subject</p>
          <h2 className="mt-1 text-xl font-black text-ink">
            {roadmap.currentSubject?.name}
          </h2>
        </div>
      </div>

      <div className="space-y-2">
        {(roadmap.completeThisSubject || []).map((step) => (
          <div
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3"
            key={step.id}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                step.completed ? "bg-primary text-slate-950" : "bg-white/10 text-muted"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold text-ink">{step.title}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Recommended next playlist
        </p>
        <p className="mt-2 font-black text-ink">
          {roadmap.recommendedNextPlaylist}
        </p>
      </div>

      <div>
        <p className="subtle-label">Next recommended subject</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(roadmap.nextRecommendedSubjects || []).map((subject) => (
            <span
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-ink"
              key={subject.id}
            >
              {subject.name}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};

const StudyPlanPage = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(toInputDate());
  const [planBundle, setPlanBundle] = useState(null);
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const planRequestRef = useRef(0);
  const progressRequestRef = useRef(0);

  useEffect(() => {
    const requestId = planRequestRef.current + 1;
    planRequestRef.current = requestId;
    let isActive = true;

    const loadPlan = async () => {
      setIsLoading(true);
      setError("");

      try {
        const { data } = await fetchStudyPlan(selectedDate);
        if (!isActive || requestId !== planRequestRef.current) {
          return;
        }
        setPlanBundle(data);
      } catch (loadError) {
        if (!isActive || requestId !== planRequestRef.current) {
          return;
        }
        setError(
          loadError.response?.data?.message ||
            "We couldn't load today's lecture."
        );
      } finally {
        if (isActive && requestId === planRequestRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadPlan();

    return () => {
      isActive = false;
    };
  }, [selectedDate, reloadKey]);

  const handleToggleTask = useCallback(async (task, progressUpdate = { completed: true }) => {
    const requestId = progressRequestRef.current + 1;
    progressRequestRef.current = requestId;
    const isManualCompletion = progressUpdate.completed === true;

    if (isManualCompletion) {
      setBusyTaskId(task._id);
    }

    setError("");
    setNotice("");

    try {
      const { data } = isManualCompletion
        ? await completeStudyPlanTask(task._id, progressUpdate)
        : await updateTaskProgress(task._id, progressUpdate);
      if (requestId !== progressRequestRef.current) {
        return;
      }

      setPlanBundle((current) => ({
        plan: data.plan,
        progress: data.progress,
        studyPlan: data.studyPlan,
        learningFlow: current?.learningFlow || null,
      }));
      if (isManualCompletion) {
        setNotice("Task completed. Progress, active days, and streak updated.");
      }
    } catch (updateError) {
      if (requestId !== progressRequestRef.current) {
        return;
      }

      setError(
        updateError.response?.data?.message ||
          "We couldn't update that lecture yet."
      );
    } finally {
      if (isManualCompletion && requestId === progressRequestRef.current) {
        setBusyTaskId(null);
      }
    }
  }, []);

  const handleVideoStateChange = useCallback((videoState) => {
    if (!videoState?.youtubeVideoId) {
      return;
    }

    setPlanBundle((current) => {
      if (!current?.learningFlow) {
        return current;
      }

      return {
        ...current,
        learningFlow: {
          ...current.learningFlow,
          progressByVideoId: {
            ...(current.learningFlow.progressByVideoId || {}),
            [videoState.youtubeVideoId]: videoState,
          },
          continueLearning: [
            videoState,
            ...(current.learningFlow.continueLearning || []).filter(
              (item) => item.youtubeVideoId !== videoState.youtubeVideoId
            ),
          ]
            .filter((item) => !item.completed && item.percent > 0)
            .slice(0, 8),
          recentlyWatched: [
            videoState,
            ...(current.learningFlow.recentlyWatched || []).filter(
              (item) => item.youtubeVideoId !== videoState.youtubeVideoId
            ),
          ].slice(0, 8),
        },
      };
    });
  }, []);

  const plan = planBundle?.plan;
  const progress = planBundle?.progress;
  const learningFlow = planBundle?.learningFlow || {};

  return (
    <div className="space-y-6">
      <section className="panel space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="subtle-label">Learn</p>
            <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">
              {plan?.trackName || user?.course || "Today's lecture"}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted">
              Watch the assigned lecture inside LearnNexus. Your daily limit is
              one 1-hour task.
            </p>
          </div>

          <label className="block space-y-2 md:w-56">
            <span className="text-sm font-semibold text-ink">Plan date</span>
            <input
              className="field"
              onChange={(event) => setSelectedDate(event.target.value)}
              type="date"
              value={selectedDate}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm text-muted">Date</p>
            <p className="mt-1 font-bold text-ink">
              {plan ? formatStudyDate(plan.dateKey || plan.date) : "Loading"}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <PlayCircle className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm text-muted">Today&apos;s task</p>
            <p className="mt-1 font-bold text-ink">1 video lecture</p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm text-muted">Completed</p>
            <p className="mt-1 font-bold text-ink">
              {progress?.completedTasks || 0}/{progress?.totalTasks || 0}
            </p>
          </div>
        </div>

        {progress ? (
          <ProgressBar
            current={progress.completedTasks}
            label="Today's progress"
            total={progress.totalTasks}
            value={progress.completionRate}
          />
        ) : null}
      </section>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
          <span>{error}</span>
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setReloadKey((value) => value + 1)} type="button">
            Retry
          </button>
        </div>
      ) : null}
      {notice ? (
        <p className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          {notice}
        </p>
      ) : null}

      {isLoading ? (
        <div className="panel text-center">
          <p className="text-sm font-medium text-muted">Loading lecture...</p>
        </div>
      ) : plan?.tasks?.length ? (
        <div className="space-y-6">
          <div className="grid gap-4">
            {plan.tasks.map((task) => (
              <TaskCard
                busy={busyTaskId === task._id}
                key={task._id}
                learningFlow={learningFlow}
                onToggle={handleToggleTask}
                onVideoStateChange={handleVideoStateChange}
                task={task}
              />
            ))}
          </div>
          <LearningRow
            emptyText="Start a lecture and your exact resume point will appear here."
            items={learningFlow.continueLearning || []}
            title="Continue learning"
          />
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <LearningRow
                emptyText="Recommended playlists will appear after verified imports are available for your subject and language."
                items={learningFlow.recommendedForYou || []}
                title="Recommended for you"
                type="playlist"
              />
              <LearningRow
                emptyText="Recently watched lectures appear after your first session."
                items={learningFlow.recentlyWatched || []}
                title="Recently watched"
              />
            </div>
            <RoadmapPanel roadmap={learningFlow.roadmap} />
          </div>
        </div>
      ) : (
        <EmptyState
          description="No lecture is available for this date yet."
          title="No lecture assigned"
        />
      )}
    </div>
  );
};

export default StudyPlanPage;
