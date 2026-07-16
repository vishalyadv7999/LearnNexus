export const getYouTubeVideoId = (url = "") => {
  const embedMatch = url.match(/\/embed\/([^?&/]+)/);

  if (embedMatch) {
    return embedMatch[1];
  }

  const watchMatch = url.match(/[?&]v=([^?&/]+)/);

  if (watchMatch) {
    return watchMatch[1];
  }

  const shortMatch = url.match(/youtu\.be\/([^?&/]+)/);
  return shortMatch?.[1] || "";
};

export const getYouTubeStartSeconds = (url = "") => {
  const match = String(url || "").match(/[?&](?:t|start)=([^?&]+)/);

  if (!match) {
    return 0;
  }

  const token = match[1];
  const hourMatch = token.match(/(\d+)h/);
  const minuteMatch = token.match(/(\d+)m/);
  const secondMatch = token.match(/(\d+)s?/);

  if (hourMatch || minuteMatch || secondMatch) {
    return (
      (Number(hourMatch?.[1]) || 0) * 3600 +
      (Number(minuteMatch?.[1]) || 0) * 60 +
      (Number(secondMatch?.[1]) || 0)
    );
  }

  return Number(token) || 0;
};

export const buildYouTubeEmbedUrl = (videoId, params = {}) => {
  if (!videoId) {
    return "";
  }

  const searchParams = new URLSearchParams({
    enablejsapi: "1",
    rel: "0",
    playsinline: "1",
    origin: window.location.origin,
    ...params,
  });

  return `https://www.youtube.com/embed/${videoId}?${searchParams.toString()}`;
};

export const buildYouTubeThumbnailUrl = (videoId) =>
  videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";

export const normalizeVideo = (video = {}, fallback = {}) => {
  const sourceUrl = video.videoUrl || fallback.videoUrl || "";
  const videoId = getYouTubeVideoId(
    video.videoEmbedUrl || sourceUrl || fallback.videoEmbedUrl
  );

  return {
    id: videoId || video.videoUrl || video.videoTitle || fallback.videoTitle,
    videoId,
    title: video.videoTitle || fallback.videoTitle || "Untitled lesson",
    url: video.videoUrl || fallback.videoUrl || "",
    embedUrl:
      video.videoEmbedUrl ||
      fallback.videoEmbedUrl ||
      buildYouTubeEmbedUrl(videoId),
    thumbnailUrl:
      video.videoThumbnailUrl ||
      fallback.videoThumbnailUrl ||
      buildYouTubeThumbnailUrl(videoId),
    channel:
      video.creatorName ||
      video.creator ||
      fallback.creatorName ||
      fallback.creator ||
      video.videoChannel ||
      fallback.videoChannel ||
      "YouTube",
    creatorId: video.creatorId || fallback.creatorId || "",
    creator:
      video.creator ||
      video.creatorName ||
      fallback.creator ||
      fallback.creatorName ||
      video.videoChannel ||
      fallback.videoChannel ||
      "YouTube",
    channelName:
      video.channelName ||
      video.creatorName ||
      video.creator ||
      fallback.channelName ||
      fallback.creatorName ||
      fallback.creator ||
      video.videoChannel ||
      fallback.videoChannel ||
      "YouTube",
    course: video.course || fallback.course || "",
    source: video.source || fallback.source || "",
    channelId: video.videoChannelId || fallback.videoChannelId || "",
    language: video.videoLanguage || fallback.videoLanguage || "",
    subject:
      video.subjectName ||
      fallback.subjectName ||
      video.videoSubject ||
      fallback.videoSubject ||
      "",
    subjectTag: video.videoSubjectTag || fallback.videoSubjectTag || "",
    semester: video.videoSemester || fallback.videoSemester || "",
    difficulty:
      video.difficultyLabel ||
      fallback.difficultyLabel ||
      video.difficulty ||
      fallback.difficulty ||
      "",
    playlistTitle: video.playlistTitle || fallback.playlistTitle || "",
    playlistId: video.playlistId || fallback.playlistId || "",
    playlistUrl:
      video.playlistUrl ||
      fallback.playlistUrl ||
      (video.playlistId || fallback.playlistId
        ? `https://www.youtube.com/playlist?list=${video.playlistId || fallback.playlistId}`
        : ""),
    curatedVideoId: video.videoId || fallback.videoId || videoId || "",
    playlistPosition:
      Number.isFinite(Number(video.playlistPosition ?? fallback.playlistPosition))
        ? Number(video.playlistPosition ?? fallback.playlistPosition)
        : null,
    initialStartSeconds: getYouTubeStartSeconds(sourceUrl),
    importStatus: video.importStatus || fallback.importStatus || "",
    verified: video.videoVerified === true || fallback.videoVerified === true,
    recommendationScore:
      Number(video.recommendationScore || fallback.recommendationScore) || 0,
    recommendationConfidence:
      video.recommendationConfidence || fallback.recommendationConfidence || "none",
    recommendationReason:
      video.recommendationReason || fallback.recommendationReason || "",
    fallbackUsed: video.fallbackUsed === true || fallback.fallbackUsed === true,
    durationLabel:
      video.videoDurationLabel || fallback.videoDurationLabel || "Lesson video",
    durationSeconds:
      Number(video.videoDurationSeconds || fallback.videoDurationSeconds) || 0,
    views: Number(video.videoViews || fallback.videoViews) || 0,
  };
};

const normalizeComparable = (value = "") => String(value).trim().toLowerCase();

const hasSameChannel = (primary, video) => {
  if (primary.channelId && video.channelId) {
    return primary.channelId === video.channelId;
  }

  return (
    Boolean(primary.channel && video.channel) &&
    normalizeComparable(primary.channel) === normalizeComparable(video.channel)
  );
};

const isSameCuratedVideo = (primary, video) => {
  if (primary.source !== "curated") {
    return true;
  }

  if (video.source !== "curated") {
    return false;
  }

  const sameCreator =
    normalizeComparable(primary.creator || primary.channel) ===
    normalizeComparable(video.creator || video.channel);
  const sameCourse = normalizeComparable(primary.course) === normalizeComparable(video.course);

  if (!sameCreator || !sameCourse) {
    return false;
  }

  if (primary.playlistId) {
    return video.playlistId === primary.playlistId;
  }

  return !video.playlistId && video.id === primary.id;
};

const isSameLearningPathVideo = (primary, video) => {
  if (!primary?.id || !video?.id || primary.id === video.id) {
    return false;
  }

  if (!isSameCuratedVideo(primary, video)) {
    return false;
  }

  if (primary.source === "curated") {
    return true;
  }

  if (primary.playlistId && video.playlistId === primary.playlistId) {
    return true;
  }

  if (hasSameChannel(primary, video)) {
    return true;
  }

  return !primary.playlistId && !primary.channelId && !primary.channel;
};

export const buildTaskVideoList = (task) => {
  const primary = normalizeVideo({
    videoTitle: task.videoTitle || task.topic,
    videoUrl: task.videoUrl,
    videoEmbedUrl: task.videoEmbedUrl,
    videoThumbnailUrl: task.videoThumbnailUrl,
    videoChannel: task.videoChannel,
    creatorName: task.creatorName,
    creatorId: task.creatorId,
    creator: task.creator,
    channelName: task.channelName,
    course: task.course,
    source: task.source,
    videoId: task.videoId,
    videoChannelId: task.videoChannelId,
    videoLanguage: task.videoLanguage,
    videoSubject: task.videoSubject,
    subjectName: task.subjectName,
    videoSubjectTag: task.videoSubjectTag,
    videoSemester: task.videoSemester,
    videoVerified: task.videoVerified,
    recommendationScore: task.recommendationScore,
    recommendationConfidence: task.recommendationConfidence,
    recommendationReason: task.recommendationReason,
    fallbackUsed: task.fallbackUsed,
    videoDurationLabel: task.videoDurationLabel,
    difficultyLabel: task.difficultyLabel,
    playlistTitle: task.playlistTitle,
    playlistId: task.playlistId,
    playlistPosition: task.playlistPosition,
  });

  const seen = new Set();
  const relatedVideos = (task.relatedVideos || [])
    .map((video) => normalizeVideo(video))
    .filter((video) => isSameLearningPathVideo(primary, video));

  return [primary, ...relatedVideos]
    .filter((video) => video.videoId || video.embedUrl)
    .filter((video) => {
      const key = video.videoId || video.embedUrl || video.url;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

export const formatViews = (views = 0) => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }

  if (views >= 1000) {
    return `${Math.round(views / 1000)}K views`;
  }

  return views ? `${views} views` : "Views unavailable";
};
