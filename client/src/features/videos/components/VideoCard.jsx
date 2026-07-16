import { BadgeCheck, PlayCircle } from "lucide-react";
import { memo } from "react";
import { formatViews } from "../utils/youtube";

const VideoCard = ({ isActive = false, onSelect, video }) => (
  <button
    className={`group grid w-full grid-cols-[112px_1fr] gap-3 rounded-2xl border p-2 text-left transition duration-200 ${
      isActive
        ? "border-primary/60 bg-primary/15"
        : "border-white/10 bg-white/[0.06] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.09]"
    }`}
    onClick={onSelect}
    type="button"
  >
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
      {video.thumbnailUrl ? (
        <img
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
          src={video.thumbnailUrl}
        />
      ) : (
        <div className="h-full w-full bg-white/10" />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white opacity-90 transition group-hover:bg-black/35">
        <PlayCircle className="h-8 w-8" />
      </span>
      {video.durationLabel ? (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {video.durationLabel}
        </span>
      ) : null}
    </div>

    <div className="min-w-0 py-1">
      <p className="line-clamp-2 text-sm font-bold leading-5 text-white">
        {video.title}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-white/55">
        {video.channel}
      </p>
      {video.playlistTitle ? (
        <p className="mt-1 truncate text-xs font-semibold text-white/42">
          {Number.isFinite(video.playlistPosition) ? `${video.playlistPosition + 1}. ` : ""}
          {video.playlistTitle}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {video.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/12 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
            <BadgeCheck className="h-3 w-3" />
            Verified
          </span>
        ) : null}
        {video.language ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">
            {video.language}
          </span>
        ) : null}
        {video.subject ? (
          <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
            {video.subject}
          </span>
        ) : null}
        {video.difficulty ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">
            {video.difficulty}
          </span>
        ) : null}
        {video.recommendationConfidence && video.recommendationConfidence !== "none" ? (
          <span className="rounded-full bg-emerald-300/12 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
            {video.recommendationConfidence} confidence
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-white/45">{formatViews(video.views)}</p>
      {video.recommendationReason ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/48">
          {video.recommendationReason}
        </p>
      ) : null}
    </div>
  </button>
);

export default memo(VideoCard);
