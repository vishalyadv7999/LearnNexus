import {
  AlertTriangle,
  Maximize2,
  Minimize2,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

let youtubeApiPromise;
const YOUTUBE_API_TIMEOUT_MS = 15000;

const loadYouTubeApi = () => {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      const existingScript = document.querySelector(
        "script[src='https://www.youtube.com/iframe_api']"
      );
      const script =
        existingScript ||
        Object.assign(document.createElement("script"), {
          src: "https://www.youtube.com/iframe_api",
          async: true,
        });
      let settled = false;
      let timeoutId = null;

      const cleanup = () => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        script.removeEventListener("error", handleScriptError);
      };

      const resolveWithApi = () => {
        if (settled || !window.YT?.Player) {
          return;
        }

        settled = true;
        cleanup();
        resolve(window.YT);
      };

      function handleScriptError() {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        youtubeApiPromise = null;
        reject(new Error("The YouTube player API could not be loaded."));
      }

      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousCallback === "function") {
          previousCallback();
        }

        resolveWithApi();
      };

      script.addEventListener("error", handleScriptError, { once: true });
      timeoutId = window.setTimeout(() => {
        handleScriptError();
      }, YOUTUBE_API_TIMEOUT_MS);

      if (!existingScript) {
        document.body.appendChild(script);
      }

      resolveWithApi();
    });
  }

  return youtubeApiPromise;
};

const formatClock = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = String(safeSeconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
};

const VideoPlayer = ({
  autoPlay = false,
  className = "",
  onEnded,
  onProgress,
  onStateChange,
  onVideoDataChange,
  startSeconds = 0,
  title,
  video,
}) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const lastProgressRef = useRef(0);
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  const onStateChangeRef = useRef(onStateChange);
  const onVideoDataChangeRef = useRef(onVideoDataChange);
  const lastVideoDataRef = useRef("");
  const playerId = useMemo(
    () =>
      `yt-player-${video?.videoId || "embed"}-${video?.playlistId || "single"}-${Math.random()
        .toString(36)
        .slice(2)}`,
    [video?.playlistId, video?.videoId]
  );
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState({
    currentSeconds: 0,
    durationSeconds: 0,
    percent: 0,
  });

  useEffect(() => {
    onEndedRef.current = onEnded;
    onProgressRef.current = onProgress;
    onStateChangeRef.current = onStateChange;
    onVideoDataChangeRef.current = onVideoDataChange;
  }, [onEnded, onProgress, onStateChange, onVideoDataChange]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!video?.videoId) {
      setHasError(true);
      return undefined;
    }

    let isMounted = true;
    setIsReady(false);
    setIsPlaying(false);
    setHasError(false);
    setProgress({ currentSeconds: 0, durationSeconds: 0, percent: 0 });
    lastProgressRef.current = 0;
    lastVideoDataRef.current = "";

    const emitCurrentVideoData = () => {
      const player = playerRef.current;
      const data = player?.getVideoData?.();
      const videoId = data?.video_id || data?.videoId || "";
      const playlist = typeof player?.getPlaylist === "function" ? player.getPlaylist() || [] : [];
      const playlistIndex =
        typeof player?.getPlaylistIndex === "function" ? player.getPlaylistIndex() : -1;

      if (!videoId) {
        return;
      }

      const key = [
        videoId,
        data.title || "",
        data.author || "",
        playlistIndex,
        playlist.length,
      ].join("|");

      if (key === lastVideoDataRef.current) {
        return;
      }

      lastVideoDataRef.current = key;
      onVideoDataChangeRef.current?.({
        videoId,
        title: data.title || "",
        channel: data.author || "",
        playlist,
        playlistIndex,
      });
    };

    loadYouTubeApi()
      .then((YT) => {
        if (!isMounted || !document.getElementById(playerId)) {
          return;
        }

        const playlistVars = video.playlistId
          ? {
              list: video.playlistId,
              listType: "playlist",
            }
          : {};

        playerRef.current = new YT.Player(playerId, {
          videoId: video.videoId,
          playerVars: {
            autoplay: autoPlay ? 1 : 0,
            controls: 1,
            enablejsapi: 1,
            fs: 1,
            ...playlistVars,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (!isMounted) {
                return;
              }

              setIsReady(true);
              emitCurrentVideoData();
              if (startSeconds > 0) {
                playerRef.current?.seekTo?.(Math.max(0, Math.floor(startSeconds)), true);
              }

              if (autoPlay) {
                playerRef.current?.playVideo?.();
              }
            },
            onError: () => {
              if (isMounted) {
                setHasError(true);
                setIsPlaying(false);
              }
            },
            onStateChange: (event) => {
              if (!isMounted) {
                return;
              }

              if (event.data === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                emitCurrentVideoData();
                onStateChangeRef.current?.("playing");
                return;
              }

              if (event.data === YT.PlayerState.ENDED) {
                setIsPlaying(false);
                emitCurrentVideoData();
                onStateChangeRef.current?.("ended");
                onEndedRef.current?.();
                return;
              }

              if (
                event.data === YT.PlayerState.PAUSED ||
                event.data === YT.PlayerState.BUFFERING ||
                event.data === YT.PlayerState.CUED
              ) {
                emitCurrentVideoData();
                setIsPlaying(false);
                onStateChangeRef.current?.("paused");
              }
            },
          },
        });
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          setIsReady(false);
          setIsPlaying(false);
        }
      });

    return () => {
      isMounted = false;
      setIsPlaying(false);
      setIsReady(false);
      onStateChangeRef.current?.("paused");

      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }

      playerRef.current = null;
    };
  }, [autoPlay, playerId, video?.playlistId, video?.videoId]);

  useEffect(() => {
    if (!isReady || hasError) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const player = playerRef.current;

      if (!player?.getCurrentTime || !player?.getDuration) {
        return;
      }

      const currentSeconds = Math.floor(player.getCurrentTime() || 0);
      const durationSeconds = Math.floor(player.getDuration() || 0);
      const percent = durationSeconds
        ? Math.min(100, Math.round((currentSeconds / durationSeconds) * 100))
        : 0;

      setProgress((current) =>
        current.currentSeconds === currentSeconds &&
        current.durationSeconds === durationSeconds &&
        current.percent === percent
          ? current
          : { currentSeconds, durationSeconds, percent }
      );

      if (currentSeconds !== lastProgressRef.current) {
        lastProgressRef.current = currentSeconds;
        const data = player.getVideoData?.();
        const videoId = data?.video_id || data?.videoId || "";

        if (videoId) {
          const playlist =
            typeof player?.getPlaylist === "function" ? player.getPlaylist() || [] : [];
          const playlistIndex =
            typeof player?.getPlaylistIndex === "function" ? player.getPlaylistIndex() : -1;
          const key = [
            videoId,
            data.title || "",
            data.author || "",
            playlistIndex,
            playlist.length,
          ].join("|");

          if (key !== lastVideoDataRef.current) {
            lastVideoDataRef.current = key;
            onVideoDataChangeRef.current?.({
              videoId,
              title: data.title || "",
              channel: data.author || "",
              playlist,
              playlistIndex,
            });
          }
        }

        onProgressRef.current?.({ currentSeconds, durationSeconds, percent });
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [hasError, isReady]);

  const handlePlayPause = () => {
    if (isPlaying) {
      playerRef.current?.pauseVideo?.();
      return;
    }

    playerRef.current?.playVideo?.();
  };

  const handleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
        return;
      }

      await containerRef.current?.requestFullscreen?.();
    } catch (_error) {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  };

  if (!video?.videoId) {
    return (
      <div className={`flex aspect-video items-center justify-center rounded-2xl bg-ink p-6 text-white ${className}`}>
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-3 font-bold">Video unavailable</p>
          <p className="mt-2 text-sm leading-6 text-white/65">
            This lesson does not have a playable YouTube embed ID yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl ${
        isFullscreen ? "flex h-screen flex-col rounded-none border-0" : ""
      } ${className}`}
      ref={containerRef}
    >
      <div className={`relative ${isFullscreen ? "min-h-0 flex-1" : "aspect-video"}`}>
        <div className="h-full w-full" id={playerId} />

        {!isReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink text-white">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
              <p className="mt-3 text-sm font-semibold">Preparing video...</p>
            </div>
          </div>
        ) : null}

        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink p-6 text-white">
            <div className="max-w-md text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-accent" />
              <p className="mt-3 font-bold">This video cannot be played here</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                The video may be private, removed, age-restricted, or blocked
                from embedding.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10 bg-[rgba(8,20,22,0.96)] px-4 py-3 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{title || video.title}</p>
            <p className="mt-1 text-xs text-white/55">
              {formatClock(progress.currentSeconds)} /{" "}
              {formatClock(progress.durationSeconds)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-50"
              disabled={!isReady || hasError}
              onClick={handlePlayPause}
              type="button"
            >
              {isPlaying ? (
                <PauseCircle className="h-4 w-4" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={handleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              type="button"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

    </div>
  );
};

export default memo(VideoPlayer);
