import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock3,
  History,
  PlayCircle,
  SkipBack,
  X,
  XCircle,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import VideoPlayer from "./VideoPlayer";
import VideoPlaylist from "./VideoPlaylist";

const getHistoryKey = (taskId) => `learnnexus:video-history:${taskId}`;

const readHistory = (taskId) => {
  try {
    return JSON.parse(window.localStorage.getItem(getHistoryKey(taskId)) || "{}");
  } catch (_error) {
    return {};
  }
};

const writeHistory = (taskId, history) => {
  try {
    window.localStorage.setItem(getHistoryKey(taskId), JSON.stringify(history));
  } catch (_error) {
    // Watch history is a convenience cache; quota failures should not interrupt learning.
  }
};

const getResumeSeconds = (videoId, history = {}) =>
  history[videoId]?.completed ? 0 : history[videoId]?.currentSeconds || 0;

const getVideoStartSeconds = (video, history = {}) => {
  const resumeSeconds = getResumeSeconds(video?.id, history);

  return resumeSeconds || Number(video?.initialStartSeconds) || 0;
};

const modalProgressStateIntervalMs = 3000;
const isValidYouTubeVideoId = (value = "") => /^[\w-]{11}$/.test(String(value));

const VideoLearningModal = ({
  initialVideoId,
  isOpen,
  onClose,
  onPrimaryProgress,
  onPrimaryStateChange,
  onNeedPlaylistContinuation,
  onVideoProgress,
  onVideoComplete,
  onVideoBookmark,
  playlistCompleted = false,
  progressByVideoId = {},
  task,
  videos,
}) => {
  const [activeVideoId, setActiveVideoId] = useState(initialVideoId || videos[0]?.id);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState({});
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [nextCountdown, setNextCountdown] = useState(null);
  const [embeddedPlaylistVideo, setEmbeddedPlaylistVideo] = useState(null);
  const [iframeContinuationVideos, setIframeContinuationVideos] = useState([]);
  const [playlistPlayerReloadKey, setPlaylistPlayerReloadKey] = useState(0);
  const [playerStartSeconds, setPlayerStartSeconds] = useState(0);
  const lastHistoryWriteRef = useRef(0);
  const lastProgressStateUpdateRef = useRef(0);
  const continuationRequestRef = useRef("");
  const progressByVideoIdRef = useRef(progressByVideoId);
  const latestProgressByVideoIdRef = useRef({});

  useEffect(() => {
    progressByVideoIdRef.current = progressByVideoId;
  }, [progressByVideoId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextHistory = {
      ...readHistory(task._id),
      ...progressByVideoIdRef.current,
    };
    const nextVideoId = initialVideoId || videos[0]?.id;

    setHistory(nextHistory);
    latestProgressByVideoIdRef.current = nextHistory;
    setActiveVideoId(nextVideoId);
    setEmbeddedPlaylistVideo(null);
    setIframeContinuationVideos([]);
    setPlayerStartSeconds(
      getVideoStartSeconds(videos.find((video) => video.id === nextVideoId) || { id: nextVideoId }, nextHistory)
    );
    if (videos[0]) {
      console.debug("[LearnNexus] Playlist selection debug", {
        selectedCreatorId: videos[0].creatorId || "",
        selectedCreatorName: videos[0].channel || "",
        playlistId: videos[0].playlistId || "",
        videoId: videos[0].videoId || "",
        startIndex: Number.isFinite(Number(videos[0].playlistPosition))
          ? Number(videos[0].playlistPosition)
          : 0,
        firstLoadedVideo: videos[0].videoId || videos[0].url || "",
      });
    }
    setQuery("");
    setNextCountdown(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [initialVideoId, isOpen, task._id]);

  const orderedVideos = useMemo(() => {
    const withIndex = videos.map((video, index) => ({ video, index }));

    if (!videos.some((video) => Number.isFinite(Number(video.playlistPosition)))) {
      return videos;
    }

    return withIndex
      .sort((left, right) => {
        const leftPosition = Number(left.video.playlistPosition);
        const rightPosition = Number(right.video.playlistPosition);
        const leftHasPosition = Number.isFinite(leftPosition);
        const rightHasPosition = Number.isFinite(rightPosition);

        if (leftHasPosition && rightHasPosition) {
          return leftPosition - rightPosition || left.index - right.index;
        }

        if (leftHasPosition) {
          return -1;
        }

        if (rightHasPosition) {
          return 1;
        }

        return left.index - right.index;
      })
      .map(({ video }) => video);
  }, [videos]);

  const mergedOrderedVideos = useMemo(() => {
    const seen = new Set();

    return [...orderedVideos, ...iframeContinuationVideos].filter((video) => {
      const key = video.videoId || video.id || video.url;

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [iframeContinuationVideos, orderedVideos]);

  const activeVideo = useMemo(
    () =>
      mergedOrderedVideos.find((video) => video.id === activeVideoId) ||
      orderedVideos[0] ||
      videos[0],
    [activeVideoId, mergedOrderedVideos, orderedVideos, videos]
  );
  const activeIndex = useMemo(
    () => mergedOrderedVideos.findIndex((video) => video.id === activeVideo?.id),
    [activeVideo?.id, mergedOrderedVideos]
  );
  const previousVideo = activeIndex > 0 ? mergedOrderedVideos[activeIndex - 1] : null;
  const nextVideo = activeIndex >= 0 ? mergedOrderedVideos[activeIndex + 1] : null;
  const recommendationVideos = useMemo(() => {
    if (!activeVideo) {
      return mergedOrderedVideos.slice(0, 16);
    }

    const activePosition = Number(activeVideo.playlistPosition);

    if (activeVideo.playlistId && Number.isFinite(activePosition)) {
      return mergedOrderedVideos
        .filter(
          (video) =>
            video.playlistId === activeVideo.playlistId &&
            Number(video.playlistPosition) > activePosition
        )
        .slice(0, 16);
    }

    return activeIndex >= 0
      ? mergedOrderedVideos.slice(activeIndex + 1, activeIndex + 17)
      : mergedOrderedVideos.slice(0, 16);
  }, [activeIndex, activeVideo, mergedOrderedVideos]);

  useEffect(() => {
    if (!isOpen || !activeVideo?.playlistId || recommendationVideos.length > 0) {
      return;
    }

    const requestKey = [
      activeVideo.playlistId,
      activeVideo.videoId || activeVideo.id,
      activeVideo.playlistPosition ?? "",
      videos.length,
    ].join(":");

    if (continuationRequestRef.current === requestKey) {
      return;
    }

    continuationRequestRef.current = requestKey;
    onNeedPlaylistContinuation?.(activeVideo);
  }, [activeVideo, isOpen, onNeedPlaylistContinuation, recommendationVideos.length, videos.length]);
  const completedCount = useMemo(
    () => videos.filter((video) => history[video.id]?.completed).length,
    [history, videos]
  );
  const playlistProgressPercent = videos.length
    ? Math.round((completedCount / videos.length) * 100)
    : 0;
  const estimatedMinutesLeft = videos
    .slice(Math.max(activeIndex, 0))
    .reduce((total, video) => total + Math.max(5, Math.round((video.durationSeconds || 1800) / 60)), 0);

  const continueWatchingVideos = useMemo(
    () =>
      videos
        .filter((video) => history[video.id]?.percent > 0)
        .sort(
          (left, right) =>
            (history[right.id]?.updatedAt || 0) - (history[left.id]?.updatedAt || 0)
        )
        .slice(0, 3),
    [history, videos]
  );

  const handleSelectVideo = useCallback((video) => {
    const currentProgress =
      latestProgressByVideoIdRef.current[video.id] || history[video.id] || {};

    setActiveVideoId(video.id);
    setEmbeddedPlaylistVideo(null);
    setPlayerStartSeconds(getVideoStartSeconds(video, latestProgressByVideoIdRef.current));
    setNextCountdown(null);
    onVideoProgress?.(video, {
      currentSeconds: currentProgress.currentSeconds || 0,
      durationSeconds: currentProgress.durationSeconds || 0,
      percent: currentProgress.percent || 0,
      completed: currentProgress.completed === true,
    });
  }, [history, onVideoProgress]);

  const persistLocalVideoState = useCallback(
    (video, patch) => {
      if (!video?.id) {
        return;
      }

      setHistory((current) => {
        const nextHistory = {
          ...current,
          [video.id]: {
            ...(current[video.id] || {}),
            ...patch,
            title: video.title,
            updatedAt: Date.now(),
          },
        };

        latestProgressByVideoIdRef.current = nextHistory;
        writeHistory(task._id, nextHistory);
        return nextHistory;
      });
    },
    [task._id]
  );

  const handleMarkCompleted = useCallback(
    (video, progress = {}) => {
      const nextProgress = {
        ...progress,
        percent: 100,
        completed: true,
      };
      persistLocalVideoState(video, nextProgress);
      onVideoComplete?.(video, nextProgress);
    },
    [onVideoComplete, persistLocalVideoState]
  );

  const handleBookmark = useCallback(
    (video, bookmarked) => {
      persistLocalVideoState(video, { bookmarked });
      onVideoBookmark?.(video, bookmarked);
    },
    [onVideoBookmark, persistLocalVideoState]
  );

  const playNextVideo = useCallback(() => {
    if (nextVideo) {
      const currentProgress =
        latestProgressByVideoIdRef.current[nextVideo.id] || history[nextVideo.id] || {};

      setActiveVideoId(nextVideo.id);
      setEmbeddedPlaylistVideo(null);
      setPlayerStartSeconds(getVideoStartSeconds(nextVideo, latestProgressByVideoIdRef.current));
      setNextCountdown(null);
      onVideoProgress?.(nextVideo, {
        currentSeconds: currentProgress.currentSeconds || 0,
        durationSeconds: currentProgress.durationSeconds || 0,
        percent: currentProgress.percent || 0,
        completed: currentProgress.completed === true,
      });
    }
  }, [history, nextVideo, onVideoProgress]);

  const handleEmbeddedVideoDataChange = useCallback(
    (videoData) => {
      const playlistIds = Array.isArray(videoData?.playlist)
        ? videoData.playlist.filter(Boolean)
        : [];
      const activePlaylistIndex = Number(videoData?.playlistIndex);
      const currentPlaylistIndex = Number.isFinite(activePlaylistIndex)
        ? activePlaylistIndex
        : playlistIds.findIndex((videoId) => videoId === videoData?.videoId);

      if (playlistIds.length > 0 && currentPlaylistIndex >= 0 && activeVideo?.playlistId) {
        const generatedVideos = playlistIds
          .slice(currentPlaylistIndex + 1, currentPlaylistIndex + 17)
          .filter(isValidYouTubeVideoId)
          .map((videoId, offset) => {
            const playlistPosition = currentPlaylistIndex + offset + 1;

            return {
              ...activeVideo,
              id: videoId,
              videoId,
              title: `${activeVideo.playlistTitle || activeVideo.title || "Playlist"} - Video ${
                playlistPosition + 1
              }`,
              url: `https://www.youtube.com/watch?v=${videoId}&list=${activeVideo.playlistId}`,
              embedUrl: `https://www.youtube.com/embed/${videoId}?list=${activeVideo.playlistId}`,
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              playlistPosition,
              isEmbeddedPlaylistContinuation: true,
              recommendationReason:
                "Continuing from the same YouTube playlist detected in the embedded player.",
            };
          });

        if (generatedVideos.length > 0) {
          setIframeContinuationVideos((current) => {
            const merged = [...current, ...generatedVideos];
            const seen = new Set();

            // The YouTube iframe can report only a partial playlist window
            // after the user jumps ahead. Merge new detections into the old
            // continuation list instead of replacing it, otherwise videos
            // after #15 disappear from the classroom sidebar.
            return merged
              .filter((video) => {
                const key = video.videoId || video.id || video.url;

                if (!key || seen.has(key)) {
                  return false;
                }

                seen.add(key);
                return video.playlistId === activeVideo.playlistId;
              })
              .sort((left, right) => {
                const leftPosition = Number(left.playlistPosition);
                const rightPosition = Number(right.playlistPosition);

                if (Number.isFinite(leftPosition) && Number.isFinite(rightPosition)) {
                  return leftPosition - rightPosition;
                }

                if (Number.isFinite(leftPosition)) {
                  return -1;
                }

                if (Number.isFinite(rightPosition)) {
                  return 1;
                }

                return 0;
              });
          });
        }
      }

      if (!videoData?.videoId || videoData.videoId === activeVideo?.videoId) {
        setEmbeddedPlaylistVideo(null);
        return;
      }

      const matchingQueuedVideo = videos.find(
        (video) => video.videoId === videoData.videoId || video.id === videoData.videoId
      );

      if (matchingQueuedVideo) {
        setEmbeddedPlaylistVideo(null);
        return;
      }

      setEmbeddedPlaylistVideo({
        id: videoData.videoId,
        videoId: videoData.videoId,
        title: videoData.title || "Continuing playlist video",
        channel: videoData.channel || activeVideo?.channel || "YouTube",
      });
    },
    [
      activeVideo,
      activeVideo?.channel,
      activeVideo?.playlistId,
      activeVideo?.playlistTitle,
      activeVideo?.title,
      activeVideo?.videoId,
      videos,
    ]
  );

  const handleEnded = useCallback(() => {
    if (!activeVideo?.id) {
      return;
    }

    const completedProgress = {
      currentSeconds:
        latestProgressByVideoIdRef.current[activeVideo.id]?.durationSeconds ||
        latestProgressByVideoIdRef.current[activeVideo.id]?.currentSeconds ||
        0,
      durationSeconds:
        latestProgressByVideoIdRef.current[activeVideo.id]?.durationSeconds ||
        latestProgressByVideoIdRef.current[activeVideo.id]?.currentSeconds ||
        0,
      percent: 100,
      completed: true,
    };
    handleMarkCompleted(activeVideo, completedProgress);

    if (nextVideo && isAutoplayEnabled) {
      setNextCountdown(5);
    }
  }, [activeVideo, handleMarkCompleted, isAutoplayEnabled, nextVideo]);

  useEffect(() => {
    if (nextCountdown === null) {
      return undefined;
    }

    if (nextCountdown <= 0) {
      playNextVideo();
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setNextCountdown((current) => (current === null ? null : current - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [nextCountdown, playNextVideo]);

  const handleProgress = useCallback(
    (progress) => {
      if (!activeVideo?.id) {
        return;
      }

      const now = Date.now();
      const existingProgress = latestProgressByVideoIdRef.current[activeVideo.id] || {};
      const nextVideoProgress = {
        ...existingProgress,
        ...progress,
        title: activeVideo.title,
        updatedAt: now,
      };
      latestProgressByVideoIdRef.current = {
        ...latestProgressByVideoIdRef.current,
        [activeVideo.id]: nextVideoProgress,
      };

      const shouldUpdateModalState =
        progress.completed === true ||
        now - lastProgressStateUpdateRef.current >= modalProgressStateIntervalMs ||
        Math.abs(Number(progress.percent || 0) - Number(existingProgress.percent || 0)) >= 2;

      if (shouldUpdateModalState) {
        lastProgressStateUpdateRef.current = now;
        setHistory((current) => {
          const nextHistory = {
            ...current,
            [activeVideo.id]: nextVideoProgress,
          };

          if (now - lastHistoryWriteRef.current >= 5000) {
            lastHistoryWriteRef.current = now;
            writeHistory(task._id, nextHistory);
          }

          return nextHistory;
        });
      }

      onVideoProgress?.(activeVideo, progress);

      if (activeVideo.id === videos[0]?.id) {
        onPrimaryProgress?.(progress);
      }
    },
    [activeVideo, onPrimaryProgress, onVideoProgress, task._id, videos]
  );

  if (!isOpen || !activeVideo) {
    return null;
  }

  const activeProgress = history[activeVideo.id]?.percent || 0;
  const isBookmarked = history[activeVideo.id]?.bookmarked === true;
  const displayVideo = embeddedPlaylistVideo
    ? {
        ...activeVideo,
        id: embeddedPlaylistVideo.id,
        videoId: embeddedPlaylistVideo.videoId,
        title: embeddedPlaylistVideo.title,
        channel: embeddedPlaylistVideo.channel,
        durationLabel: "Embedded playlist video",
        recommendationReason:
          "Continuing from the same curated YouTube playlist inside LearnNexus. Add YOUTUBE_API_KEY and import playlists to show this item as a full LearnNexus related-video card.",
      }
    : activeVideo;
  const watchNextLabel =
    nextVideo?.title ||
    (playlistCompleted
      ? "You've reached the end of this playlist."
      : activeVideo.playlistId
        ? "Continue in embedded playlist"
        : "Subject complete");
  const notesText = embeddedPlaylistVideo
    ? `This video is playing from ${activeVideo.playlistTitle || "the same curated playlist"} inside the embedded YouTube player. Add YOUTUBE_API_KEY and import playlists to show every playlist item with full LearnNexus metadata.`
    : task.notesText || task.conceptSummary;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#05090b]/95 text-white backdrop-blur-xl">
      <div className="min-h-screen p-4 sm:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                LearnNexus video classroom
              </p>
              <h2 className="mt-1 truncate text-2xl font-extrabold sm:text-3xl">
                {task.topic}
              </h2>
              <p className="mt-2 text-sm text-white/55">
                {task.subject} / {task.videoChannel || displayVideo.channel}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {displayVideo.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-bold text-emerald-100">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified creator
                  </span>
                ) : null}
                {displayVideo.language ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">
                    {displayVideo.language}
                  </span>
                ) : null}
                {displayVideo.subject ? (
                  <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                    {displayVideo.subject}
                  </span>
                ) : null}
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">
                  {completedCount}/{videos.length} lectures complete
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-bold transition hover:bg-white/15"
                onClick={() => setIsAutoplayEnabled((current) => !current)}
                type="button"
              >
                <PlayCircle className="h-4 w-4" />
                Autoplay {isAutoplayEnabled ? "on" : "off"}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-bold transition hover:bg-white/15"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </header>

          {continueWatchingVideos.length ? (
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Continue watching</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {continueWatchingVideos.map((video) => (
                  <button
                    className="rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-primary/40 hover:bg-white/[0.07]"
                    key={video.id}
                    onClick={() => handleSelectVideo(video)}
                    type="button"
                  >
                    <p className="line-clamp-1 text-sm font-bold">{video.title}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${history[video.id]?.percent || 0}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid min-h-[72vh] gap-4 xl:grid-cols-[1fr_380px]">
            <main className="min-w-0 space-y-4">
              <VideoPlayer
                autoPlay
                onEnded={handleEnded}
                onProgress={handleProgress}
                onStateChange={
                  activeVideo.id === videos[0]?.id ? onPrimaryStateChange : undefined
                }
                onVideoDataChange={handleEmbeddedVideoDataChange}
                key={`${activeVideo.id}-${playlistPlayerReloadKey}`}
                startSeconds={playerStartSeconds}
                title={displayVideo.title}
                video={activeVideo}
              />
              {nextCountdown !== null ? (
                <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-white">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black">
                        Next video starts in {nextCountdown} seconds
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        {nextVideo?.title}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold transition hover:bg-white/15"
                        disabled={!previousVideo}
                        onClick={() => previousVideo && handleSelectVideo(previousVideo)}
                        type="button"
                      >
                        <SkipBack className="h-4 w-4" />
                        Previous video
                      </button>
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold transition hover:bg-white/15"
                        onClick={() => setNextCountdown(null)}
                        type="button"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </button>
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-black text-slate-950 transition hover:brightness-110"
                        onClick={playNextVideo}
                        type="button"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Play now
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                      Now playing
                    </p>
                    <h3 className="mt-2 text-2xl font-extrabold">
                      {displayVideo.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/55">
                      {displayVideo.channel} / {displayVideo.durationLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Clock3 className="h-4 w-4 text-primary" />
                      {activeProgress}% watched
                    </div>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${playlistProgressPercent}%` }}
                  />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-white/60 sm:grid-cols-3">
                  <p>Watch next: {watchNextLabel}</p>
                  <p>Completed: {completedCount}/{videos.length}</p>
                  <p>Estimated time left: {estimatedMinutesLeft} min</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold transition hover:bg-white/15"
                    disabled={!previousVideo}
                    onClick={() => previousVideo && handleSelectVideo(previousVideo)}
                    type="button"
                  >
                    <SkipBack className="h-4 w-4" />
                    Previous video
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold transition hover:bg-white/15"
                    onClick={() => handleBookmark(activeVideo, !isBookmarked)}
                    type="button"
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {isBookmarked ? "Bookmarked" : "Bookmark"}
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold transition hover:bg-white/15"
                    onClick={() =>
                      handleMarkCompleted(activeVideo, {
                        currentSeconds: history[activeVideo.id]?.durationSeconds || 0,
                        durationSeconds: history[activeVideo.id]?.durationSeconds || 0,
                        percent: 100,
                        completed: true,
                      })
                    }
                    type="button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as completed
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:opacity-50"
                    disabled={!nextVideo}
                    onClick={playNextVideo}
                    type="button"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Next video
                  </button>
                  {!nextVideo && activeVideo.playlistUrl ? (
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold transition hover:bg-white/15"
                      onClick={() => {
                        setPlayerStartSeconds(0);
                        setPlaylistPlayerReloadKey((current) => current + 1);
                      }}
                      type="button"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Continue playlist here
                    </button>
                  ) : null}
                </div>

                {!nextVideo && playlistCompleted ? (
                  <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100">
                    You've reached the end of this playlist.
                  </div>
                ) : null}

                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/62">
                  {displayVideo.recommendationReason ||
                    "Keep watching inside LearnNexus. When a video ends, the next related lesson starts automatically so your learning flow stays uninterrupted."}
                </p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                    Notes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    {notesText}
                  </p>
                </div>
              </section>
            </main>

            <VideoPlaylist
              activeVideoId={activeVideo.id}
              onSelectVideo={handleSelectVideo}
              query={query}
              setQuery={setQuery}
              videos={recommendationVideos}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(VideoLearningModal);
