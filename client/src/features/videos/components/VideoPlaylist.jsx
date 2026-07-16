import { Filter, Search } from "lucide-react";
import { memo, useMemo, useState } from "react";
import VideoCard from "./VideoCard";

const VideoPlaylist = ({
  activeVideoId,
  onSelectVideo,
  query,
  setQuery,
  videos = [],
}) => {
  const [filters, setFilters] = useState({
    creator: "all",
    educatorGroup: "all",
    difficulty: "all",
    language: "all",
    playlist: "all",
    semester: "all",
    subject: "all",
  });
  const filterOptions = useMemo(() => {
    const unique = (key) =>
      Array.from(new Set(videos.map((video) => video[key]).filter(Boolean))).sort();

    return {
      creators: unique("channel"),
      difficulties: unique("difficulty"),
      languages: unique("language"),
      playlists: unique("playlistTitle"),
      semesters: unique("semester"),
      subjects: unique("subject"),
    };
  }, [videos]);

  const filteredVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return videos.filter((video) =>
      (filters.creator === "all" || video.channel === filters.creator) &&
      (filters.educatorGroup === "all" ||
        (filters.educatorGroup === "mixed"
          ? !video.language || video.language === "Mixed"
          : video.language === filters.educatorGroup)) &&
      (filters.difficulty === "all" || video.difficulty === filters.difficulty) &&
      (filters.language === "all" || video.language === filters.language) &&
      (filters.playlist === "all" || video.playlistTitle === filters.playlist) &&
      (filters.semester === "all" || String(video.semester) === filters.semester) &&
      (filters.subject === "all" || video.subject === filters.subject) &&
      (!normalizedQuery ||
      [video.title, video.channel, video.durationLabel, video.subject, video.playlistTitle]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery))
    );
  }, [filters, query, videos]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <aside className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-white/[0.05] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
          Related videos
        </p>
        <h3 className="mt-1 text-xl font-extrabold text-white">
          Keep learning
        </h3>
        <p className="mt-1 text-xs font-semibold text-white/45">
          {filteredVideos.length} of {videos.length} videos
        </p>
      </div>

      <label className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-white">
        <Search className="h-4 w-4 text-white/45" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search videos"
          value={query}
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ["creator", "Creator", filterOptions.creators],
          ["subject", "Subject", filterOptions.subjects],
          ["educatorGroup", "Educator", ["Hindi", "English", "mixed"]],
          ["language", "Language", filterOptions.languages],
          ["playlist", "Playlist", filterOptions.playlists],
          ["difficulty", "Difficulty", filterOptions.difficulties],
          ["semester", "Semester", filterOptions.semesters.map(String)],
        ].map(([key, label, options]) => (
          <label
            className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-white"
            key={key}
          >
            <Filter className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <select
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
              onChange={(event) => updateFilter(key, event.target.value)}
              value={filters[key]}
            >
              <option className="bg-slate-950" value="all">
                {label}
              </option>
              {options.map((option) => (
                <option className="bg-slate-950" key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {filteredVideos.length ? (
          filteredVideos.map((video) => (
            <VideoCard
              isActive={video.id === activeVideoId}
              key={video.id}
              onSelect={() => onSelectVideo(video)}
              video={video}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-white/55">
            No related videos match that search.
          </div>
        )}
      </div>
    </aside>
  );
};

export default memo(VideoPlaylist);
