import {
  CheckCircle2,
  BadgeCheck,
  PlayCircle,
  Timer,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoLearningModal from "../../videos/components/VideoLearningModal";
import { updateVideoProgress } from "../../../services/progressService";
import { formatMinutes } from "../../../utils/format";
import { buildTaskVideoList } from "../../videos/utils/youtube";

const classroomWatchTimerIntervalMs = 5000;

const normalizeQuizText = (value = "") =>
  String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const buildVideoQuizQuestions = (video = {}) => {
  const title = video.title || "this video";
  const titleKey = normalizeQuizText(title);
  const channel = video.channel || "the selected creator";

  if (
    titleKey.includes("html") ||
    titleKey.includes("css") ||
    titleKey.includes("javascript") ||
    titleKey.includes("mern")
  ) {
    return [
      {
        question: "Which frontend topics are mainly covered in this video?",
        options: [
          "HTML for structure, CSS for styling, and JavaScript for interactivity.",
          "Only database backup commands.",
          "Only operating system scheduling.",
          "Only machine learning model training.",
        ],
        correctIndex: 0,
        explanation:
          "This video is about web development basics, so HTML, CSS, and JavaScript are the key starting points.",
      },
      {
        question: "What does CSS help you do in a web page?",
        options: [
          "Store user accounts in MongoDB.",
          "Style the page with colors, spacing, layout, and responsive design.",
          "Compile Java code.",
          "Train an AI model.",
        ],
        correctIndex: 1,
        explanation:
          "CSS controls how a web page looks: layout, colors, spacing, fonts, and responsiveness.",
      },
      {
        question: "What should you practice after watching this video?",
        options: [
          "Build a simple page using HTML, CSS, and JavaScript.",
          "Skip coding and only watch the thumbnail.",
          "Change to a random creator playlist.",
          "Memorize unrelated interview questions.",
        ],
        correctIndex: 0,
        explanation:
          "The best practice after a basics video is to build a small working web page yourself.",
      },
    ];
  }

  if (titleKey.includes("react router") || titleKey.includes("api")) {
    return [
      {
        question: "What is the main idea of this video?",
        options: [
          "Create multi-page React flows and fetch data from APIs.",
          "Learn only HTML table tags.",
          "Train a machine learning model.",
          "Install an operating system.",
        ],
        correctIndex: 0,
        explanation:
          "React Router handles navigation, and API calls bring external data into the app.",
      },
      {
        question: "Why do React apps use routing?",
        options: [
          "To style buttons only.",
          "To show different pages or views without reloading the full app.",
          "To store passwords in CSS.",
          "To replace JavaScript.",
        ],
        correctIndex: 1,
        explanation:
          "Routing lets a single-page React app move between views like Home, Profile, and Projects.",
      },
      {
        question: "What should you build after watching?",
        options: [
          "A small React app with routes and one API data section.",
          "A random unrelated playlist.",
          "Only a handwritten title.",
          "A database with no frontend.",
        ],
        correctIndex: 0,
        explanation:
          "A tiny app with routes and API data is the right practical output for this topic.",
      },
    ];
  }

  if (titleKey.includes("python") || titleKey.includes("machine learning") || titleKey.includes(" ml")) {
    return [
      {
        question: "What should you focus on while watching this video?",
        options: [
          "The main Python/ML concept explained in the lecture.",
          "Only the creator name.",
          "Only HTML color styling.",
          "Random unrelated videos.",
        ],
        correctIndex: 0,
        explanation:
          "The quiz follows the assigned video, so focus on the concept demonstrated in that lecture.",
      },
      {
        question: "What is a good learning habit for this video?",
        options: [
          "Pause and write the important steps or examples.",
          "Skip all examples.",
          "Only change the playlist.",
          "Avoid practicing.",
        ],
        correctIndex: 0,
        explanation:
          "Writing steps and examples makes technical videos much easier to remember.",
      },
      {
        question: "What should you do after finishing?",
        options: [
          "Try one small example from the same topic.",
          "Move to an unrelated creator immediately.",
          "Delete all notes.",
          "Ignore the next lesson.",
        ],
        correctIndex: 0,
        explanation:
          "A small example confirms that you understood the video instead of only watching it.",
      },
    ];
  }

  return [
    {
      question: `What is the main thing to learn from "${title}"?`,
      options: [
        `Understand and practice the concept explained by ${channel}.`,
        "Skip the video and mark it complete.",
        "Memorize only the thumbnail.",
        "Switch to unrelated recommendations.",
      ],
      correctIndex: 0,
      explanation:
        "The quiz is based on the actual assigned video, so the goal is to understand and practice that lecture.",
    },
    {
      question: "What should you do while watching this video?",
      options: [
        "Pause, note the important points, and try the example.",
        "Keep it running without attention.",
        "Only read the playlist title.",
        "Open unrelated videos.",
      ],
      correctIndex: 0,
      explanation:
        "Active watching helps more than passive watch time.",
    },
    {
      question: "What is the best next step after the video?",
      options: [
        "Write a short recap and practice one small example.",
        "Forget the topic immediately.",
        "Change your field every time.",
        "Ignore the selected playlist order.",
      ],
      correctIndex: 0,
      explanation:
        "A recap and one small practice example make the lesson useful.",
    },
  ];
};

const TaskCard = ({
  task,
  learningFlow = {},
  onToggle,
  onVideoStateChange,
  busy = false,
  compact = false,
}) => {
  const lastTickRef = useRef(Date.now());
  const syncedWatchSecondsRef = useRef(Number(task.watchSeconds) || 0);
  const hasSyncedCompletionRef = useRef(task.completed);
  const videoSyncRef = useRef({});
  const [playlistContinuationVideos, setPlaylistContinuationVideos] = useState([]);
  const videoList = useMemo(
    () =>
      buildTaskVideoList({
        ...task,
        relatedVideos: [
          ...(task.relatedVideos || []),
          ...playlistContinuationVideos,
        ],
      }),
    [playlistContinuationVideos, task]
  );
  const primaryVideo = videoList[0];
  const effectiveQuizQuestions = useMemo(
    () =>
      primaryVideo?.title
        ? buildVideoQuizQuestions(primaryVideo)
        : task.quizQuestions || [],
    [primaryVideo?.channel, primaryVideo?.title, task.quizQuestions]
  );
  const effectiveQuizKey = useMemo(
    () => effectiveQuizQuestions.map((question) => question.question).join("|"),
    [effectiveQuizQuestions]
  );
  const progressByVideoId = learningFlow.progressByVideoId || {};
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoHubOpen, setIsVideoHubOpen] = useState(false);
  const [learnedSeconds, setLearnedSeconds] = useState(
    Number(task.watchSeconds) || 0
  );
  const [isPlaylistCompleted, setIsPlaylistCompleted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizFeedback, setQuizFeedback] = useState(null);
  const durationSeconds = Math.max(Number(task.estimatedMinutes) || 60, 60) * 60;
  const sessionPercent = task.completed
    ? 100
    : Math.min(
        100,
        Math.max(
          Number(task.progressRate) || 0,
          Math.round((learnedSeconds / durationSeconds) * 100)
        )
      );
  const remainingMinutes = Math.max(
    0,
    Math.ceil((durationSeconds - learnedSeconds) / 60)
  );

  useEffect(() => {
    setLearnedSeconds(Number(task.watchSeconds) || 0);
    syncedWatchSecondsRef.current = Number(task.watchSeconds) || 0;
    hasSyncedCompletionRef.current = task.completed;
    setIsVideoPlaying(false);
  }, [task._id, task.watchSeconds, task.completed]);

  useEffect(() => {
    setPlaylistContinuationVideos([]);
    setIsPlaylistCompleted(false);
  }, [
    task._id,
    task.creatorName,
    task.playlistId,
    task.videoChannelId,
    task.videoSubjectTag,
  ]);

  useEffect(() => {
    setSelectedAnswers({});
    setQuizFeedback(
      typeof task.quizScore === "number"
        ? {
            score: task.quizScore,
            submitted: true,
          }
        : null
    );
  }, [effectiveQuizKey, task._id, task.quizScore]);

  useEffect(() => {
    if (!isVideoPlaying || task.completed) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const currentTime = Date.now();
      const deltaSeconds = Math.floor((currentTime - lastTickRef.current) / 1000);

      if (deltaSeconds <= 0) {
        return;
      }

      lastTickRef.current += deltaSeconds * 1000;
      setLearnedSeconds((current) =>
        Math.min(durationSeconds, current + deltaSeconds)
      );
    }, classroomWatchTimerIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [durationSeconds, isVideoPlaying, task.completed]);

  useEffect(() => {
    if (task.completed) {
      return;
    }

    if (learnedSeconds - syncedWatchSecondsRef.current >= 15) {
      syncedWatchSecondsRef.current = learnedSeconds;
      onToggle(task, { watchSeconds: learnedSeconds });
    }

    if (
      learnedSeconds >= durationSeconds &&
      !hasSyncedCompletionRef.current
    ) {
      hasSyncedCompletionRef.current = true;
      setIsVideoPlaying(false);
      onToggle(task, { completed: true, watchSeconds: durationSeconds });
    }
  }, [durationSeconds, learnedSeconds, onToggle, task]);

  const handlePlayerStateChange = useCallback((state) => {
    if (state === "playing") {
      lastTickRef.current = Date.now();
      setIsVideoPlaying(true);
      return;
    }

    setIsVideoPlaying(false);
  }, []);

  const handleOpenVideoHub = useCallback(() => {
    if (!isVideoHubOpen) {
      window.history.pushState(
        {
          ...(window.history.state || {}),
          learnNexusVideoHubTaskId: task._id,
        },
        "",
        window.location.href
      );
    }

    setIsVideoHubOpen(true);
  }, [isVideoHubOpen, task._id]);

  const handleCloseVideoHub = useCallback(() => {
    if (window.history.state?.learnNexusVideoHubTaskId === task._id) {
      window.history.back();
      return;
    }

    setIsVideoHubOpen(false);
  }, [task._id]);

  useEffect(() => {
    if (!isVideoHubOpen) {
      return undefined;
    }

    const handlePopState = () => {
      setIsVideoHubOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isVideoHubOpen]);

  const buildVideoProgressPayload = useCallback(
    (video, progress = {}) => ({
      currentSeconds: Math.floor(progress.currentSeconds || 0),
      durationSeconds: Math.floor(progress.durationSeconds || 0),
      percent: Math.floor(progress.percent || 0),
      completed: progress.completed === true,
      taskId: task._id,
      video: {
        videoId: video.videoId,
        title: video.title,
        youtubeLink: video.url,
        videoUrl: video.url,
        videoEmbedUrl: video.embedUrl,
        thumbnail: video.thumbnailUrl,
        videoThumbnailUrl: video.thumbnailUrl,
        channelId: video.channelId,
        videoChannelId: video.channelId,
        creatorId: video.creatorId,
        creatorName: video.channel,
        videoChannel: video.channel,
        subject: video.subjectTag || video.subject,
        videoSubject: video.subject,
        subjectName: video.subject,
        videoSubjectTag: video.subjectTag,
        language: video.language,
        videoLanguage: video.language,
        playlistId: video.playlistId,
        playlistTitle: video.playlistTitle,
        playlistPosition: video.playlistPosition,
      },
    }),
    [task._id]
  );

  const saveVideoState = useCallback(
    async (video, progress = {}, options = {}) => {
      if (!video?.videoId) {
        return;
      }

      const now = Date.now();
      const previousSync = videoSyncRef.current[video.videoId] || 0;
      const shouldSync =
        options.force ||
        progress.completed === true ||
        progress.bookmarked !== undefined ||
        now - previousSync >= 10000;

      if (!shouldSync) {
        return;
      }

      videoSyncRef.current[video.videoId] = now;

      try {
        const { data } = await updateVideoProgress(video.videoId, {
          ...buildVideoProgressPayload(video, progress),
          bookmarked: progress.bookmarked,
        });
        if (Array.isArray(data.nextPlaylistVideos) && data.nextPlaylistVideos.length > 0) {
          setIsPlaylistCompleted(false);
          setPlaylistContinuationVideos((current) => {
            const seen = new Set(
              [...(task.relatedVideos || []), ...current]
                .map((item) => item.videoId || item.videoUrl || item.videoEmbedUrl)
                .filter(Boolean)
            );
            const additions = data.nextPlaylistVideos.filter((item) => {
              const key = item.videoId || item.videoUrl || item.videoEmbedUrl;

              if (!key || seen.has(key)) {
                return false;
              }

              seen.add(key);
              return true;
            });

            // Merge the server's same-playlist continuation window into the
            // existing task queue. This keeps recommendation playback moving
            // past the initial YouTube/feed page without changing mappings,
            // ranking, or the visible classroom design.
            return additions.length ? [...current, ...additions] : current;
          });
        } else {
          setIsPlaylistCompleted(data.playlistCompleted === true);
        }
        onVideoStateChange?.(data.videoState);
      } catch (_error) {
        // The local player cache still preserves the session if a background sync fails.
      }
    },
    [buildVideoProgressPayload, onVideoStateChange, task.relatedVideos]
  );

  const handleNeedPlaylistContinuation = useCallback(
    (video) => {
      saveVideoState(
        video,
        {
          currentSeconds: 0,
          durationSeconds: 0,
          percent: 0,
          completed: false,
        },
        { force: true }
      );
    },
    [saveVideoState]
  );

  const handleClassroomVideoProgress = useCallback(
    (video, progress) => {
      saveVideoState(video, progress);
    },
    [saveVideoState]
  );

  const handleClassroomVideoComplete = useCallback(
    (video, progress) => {
      saveVideoState(video, { ...progress, completed: true }, { force: true });

      if (video?.id === primaryVideo?.id && !task.completed) {
        onToggle(task, { completed: true, watchSeconds: durationSeconds });
      }
    },
    [durationSeconds, onToggle, primaryVideo?.id, saveVideoState, task]
  );

  const handleClassroomBookmark = useCallback(
    (video, bookmarked) => {
      saveVideoState(video, { bookmarked }, { force: true });
    },
    [saveVideoState]
  );

  const handleSubmitQuiz = () => {
    const questions = effectiveQuizQuestions;

    if (questions.length === 0) {
      return;
    }

    const correctAnswers = questions.filter(
      (question, index) => selectedAnswers[index] === question.correctIndex
    ).length;
    const score = Math.round((correctAnswers / questions.length) * 100);

    setQuizFeedback({ score, submitted: true });
    onToggle(task, { quizScore: score });
  };

  return (
    <>
    <article className="panel h-full">
      <div className="flex flex-col gap-4">
        {primaryVideo ? (
          <button
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black text-left shadow-2xl transition hover:-translate-y-0.5 hover:shadow-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={handleOpenVideoHub}
            type="button"
          >
            <div className="aspect-video">
              {primaryVideo.thumbnailUrl ? (
                <img
                  alt=""
                  className="h-full w-full object-cover opacity-85 transition group-hover:scale-[1.02] group-hover:opacity-70"
                  src={primaryVideo.thumbnailUrl}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-ink" />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-slate-950 shadow-lg transition group-hover:scale-105">
                <PlayCircle className="h-6 w-6" />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Play in video classroom
              </p>
              <h3 className="mt-2 line-clamp-2 text-xl font-black sm:text-2xl">
                {primaryVideo.title}
              </h3>
              <p className="mt-2 text-sm font-semibold text-white/70">
                {primaryVideo.channel} / {primaryVideo.durationLabel}
              </p>
            </div>
          </button>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-white/70 p-6 text-center">
            <p className="font-bold text-ink">No matching videos found</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {task.recommendationReason ||
                "Try a different creator, subject, or language filter."}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {task.subject}
              </span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                1 hour
              </span>
              {task.videoChannel ? (
                <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink">
                  {task.videoChannel}
                </span>
              ) : null}
              {task.videoVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : null}
              {task.videoLanguage ? (
                <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink">
                  {task.videoLanguage}
                </span>
              ) : null}
              {task.videoSubject ? (
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                  {task.videoSubject}
                </span>
              ) : null}
            </div>
            <div>
              <h3 className="text-xl font-bold text-ink">{task.topic}</h3>
              <p
                className={`mt-2 text-sm leading-6 text-muted ${
                  compact ? "summary-clamp" : ""
                }`}
              >
                {task.conceptSummary}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink">
            {task.completed ? (
              <span className="inline-flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </span>
            ) : isVideoPlaying ? (
              <span className="inline-flex items-center gap-2 text-primary">
                <PlayCircle className="h-4 w-4" />
                Video playing
              </span>
            ) : learnedSeconds > 0 ? (
              <span className="inline-flex items-center gap-2">
                <Timer className="h-4 w-4" />
                {remainingMinutes} min left
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Not started
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="subtle-label">Video watch progress</p>
            <p className="text-sm font-semibold text-primary">{sessionPercent}%</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${sessionPercent}%` }}
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            Progress increases only while the embedded lecture is playing. If
            you pause or leave the video idle, the timer pauses too.
          </p>
          {task.recommendationReason ? (
            <div className="mt-3 rounded-xl border border-line bg-white p-3">
              <p className="subtle-label">Recommended because</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {task.recommendationReason}
              </p>
            </div>
          ) : null}
        </div>

        {effectiveQuizQuestions.length && task.completed ? (
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="subtle-label">Quick quiz</p>
                <p className="mt-1 text-sm text-muted">
                  Instant feedback adjusts your next lesson difficulty.
                </p>
              </div>
              {quizFeedback ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Score {quizFeedback.score}%
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-4">
              {effectiveQuizQuestions.map((question, questionIndex) => {
                const selectedAnswer = selectedAnswers[questionIndex];

                return (
                  <div className="space-y-2" key={question.question}>
                    <p className="text-sm font-semibold text-ink">
                      {questionIndex + 1}. {question.question}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => {
                        const isSelected = selectedAnswer === optionIndex;
                        const isCorrect =
                          quizFeedback?.submitted &&
                          optionIndex === question.correctIndex;
                        const isWrong =
                          quizFeedback?.submitted && isSelected && !isCorrect;

                        return (
                          <button
                            className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                              isCorrect
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : isWrong
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : isSelected
                                    ? "border-accent/30 bg-accent/10 text-accent"
                                    : "border-line bg-white text-ink hover:border-primary/30"
                            }`}
                            disabled={quizFeedback?.submitted}
                            key={option}
                            onClick={() =>
                              setSelectedAnswers((current) => ({
                                ...current,
                                [questionIndex]: optionIndex,
                              }))
                            }
                            type="button"
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    {quizFeedback?.submitted ? (
                      <p className="text-xs leading-5 text-muted">
                        {question.explanation}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {!quizFeedback ? (
              <button
                className="btn-secondary mt-4"
                disabled={
                  Object.keys(selectedAnswers).length !== effectiveQuizQuestions.length
                }
                onClick={handleSubmitQuiz}
                type="button"
              >
                <CheckCircle2 className="h-4 w-4" />
                Check Answers
              </button>
            ) : (
              <p className="mt-4 text-sm font-medium text-muted">
                {quizFeedback.score >= 80
                  ? "Great result. Future lessons can move harder."
                  : quizFeedback.score < 50
                    ? "We will ease the next lesson difficulty so the basics land first."
                    : "Steady progress. Your next lesson stays balanced."}
              </p>
            )}
          </div>
        ) : effectiveQuizQuestions.length ? (
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="subtle-label">Quick quiz</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Finish the video lecture first. The quiz unlocks after the lecture
              is completed.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="subtle-label">Today&apos;s output</p>
            <p className="mt-3 text-sm leading-6 text-ink">{task.practiceTask}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="subtle-label">Study load</p>
            <p className="mt-3 text-base font-semibold text-ink">
              {formatMinutes(task.estimatedMinutes)}
            </p>
          </div>
        </div>

      </div>
    </article>
    <VideoLearningModal
      initialVideoId={primaryVideo?.id}
      isOpen={isVideoHubOpen}
      onClose={handleCloseVideoHub}
      onVideoBookmark={handleClassroomBookmark}
      onVideoComplete={handleClassroomVideoComplete}
      onVideoProgress={handleClassroomVideoProgress}
      onNeedPlaylistContinuation={handleNeedPlaylistContinuation}
      onPrimaryStateChange={handlePlayerStateChange}
      progressByVideoId={progressByVideoId}
      playlistCompleted={isPlaylistCompleted}
      task={task}
      videos={videoList}
    />
    </>
  );
};

export default TaskCard;
