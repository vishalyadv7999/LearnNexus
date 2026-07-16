import { Check, Languages, PlayCircle, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchChannels, fetchCourses } from "../../auth/api/auth";
import { useAuth } from "../../../hooks/useAuth";
import {
  creatorOptionsByLanguage,
  fallbackChannelsByLanguage,
  fallbackFields,
  normalizeCreatorPreference,
} from "../config/preferenceOptions";

const SettingsPage = () => {
  const { user, updatePreferences } = useAuth();
  const [fields, setFields] = useState(fallbackFields);
  const [channels, setChannels] = useState([]);
  const [form, setForm] = useState({
    course: user?.course || fallbackFields[0],
    videoLanguage: user?.preferences?.videoLanguage || "English",
    preferredChannels: user?.preferences?.preferredChannels || [],
    preferredSubjects: [],
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const settingsRequestRef = useRef(0);

  useEffect(() => {
    const requestId = settingsRequestRef.current + 1;
    settingsRequestRef.current = requestId;
    let isActive = true;

    const loadSettingsData = async () => {
      try {
        const [{ data: courseData }, { data: channelData }] = await Promise.all([
          fetchCourses(),
          fetchChannels(form.videoLanguage, form.course),
        ]);
        if (!isActive || requestId !== settingsRequestRef.current) {
          return;
        }
        setFields(courseData.courses.map((course) => course.name));
        setChannels(channelData.channels);
      } catch (_error) {
        if (!isActive || requestId !== settingsRequestRef.current) {
          return;
        }
        setFields(fallbackFields);
        setChannels(
          (creatorOptionsByLanguage[form.videoLanguage] ||
            (fallbackChannelsByLanguage[form.videoLanguage] || []).map((name) => ({ name }))).map((creator) => ({
            id: creator.id || creator.name,
            name: creator.name,
            verified: true,
            subjectOptions: [],
          }))
        );
      }
    };

    loadSettingsData();

    return () => {
      isActive = false;
    };
  }, [form.course, form.videoLanguage]);

  const channelOptions = useMemo(
    () => channels.map((channel) => channel.id || channel.name),
    [channels]
  );
  const channelDisplayNameById = useMemo(
    () =>
      new Map(
        channels.map((channel) => [channel.id || channel.name, channel.name])
      ),
    [channels]
  );

  useEffect(() => {
    setForm((current) => ({
      ...current,
      preferredChannels: current.preferredChannels
        .map((channel) => normalizeCreatorPreference(channel, channels))
        .filter((channel) => channelOptions.includes(channel))
        .slice(0, 1),
    }));
  }, [channelOptions, channels]);

  const handleToggleChannel = (channel) => {
    setForm((current) => {
      return {
        ...current,
        preferredChannels: current.preferredChannels.includes(channel) ? [] : [channel],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.course) {
      setError("Select a learning field.");
      return;
    }

    if (channelOptions.length > 0 && form.preferredChannels.length === 0) {
      setError("Select at least one creator.");
      return;
    }

    setIsSaving(true);

    try {
      await updatePreferences({
        course: form.course,
        videoLanguage: form.videoLanguage,
        preferredChannels: form.preferredChannels,
        preferredSubjects: [],
        studyMinutesPerDay: 60,
      });
      setNotice("Settings saved.");
    } catch (saveError) {
      setError(
        saveError.response?.data?.message || "We couldn't save your settings."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="panel space-y-3">
        <p className="subtle-label">Settings</p>
        <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">
          Tune your learning workspace
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted">
          Keep your field, language, and preferred channels aligned with the way
          you study now.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="panel space-y-4">
          <div>
            <p className="subtle-label">Field</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">
              Learning direction
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => {
              const isSelected = form.course === field;

              return (
                <button
                  className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left font-semibold transition ${
                    isSelected
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-primary/30"
                  }`}
                  key={field}
                  onClick={() =>
                    setForm((current) => ({ ...current, course: field }))
                  }
                  type="button"
                >
                  <span>{field}</span>
                  {isSelected ? <Check className="h-5 w-5" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel space-y-5">
          <div>
            <p className="subtle-label">Preferences</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">
              Study format
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {["English", "Hindi"].map((language) => {
              const isSelected = form.videoLanguage === language;

              return (
                <button
                  className={`rounded-2xl border px-4 py-4 text-left font-semibold transition ${
                    isSelected
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-primary/30"
                  }`}
                  key={language}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      videoLanguage: language,
                      preferredChannels: [],
                      preferredSubjects: [],
                    }))
                  }
                  type="button"
                >
                  <Languages className="mb-2 h-5 w-5" />
                  {language}
                </button>
              );
            })}
          </div>

          <div>
            <p className="subtle-label">Creators</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {channels.length ? channels.map((channel) => {
                const creatorId = channel.id || channel.name;
                const isSelected = form.preferredChannels.includes(creatorId);

                return (
                  <button
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-line bg-white text-ink hover:border-primary/30"
                    }`}
                    key={creatorId}
                    onClick={() => handleToggleChannel(creatorId)}
                    type="button"
                  >
                    {channelDisplayNameById.get(creatorId) || channel.name}
                    {channel.verified ? (
                      <span className="ml-2 text-[0.65rem] uppercase tracking-wide">
                        Verified
                      </span>
                    ) : null}
                  </button>
                );
              }) : (
                <p className="rounded-xl border border-line bg-white/70 px-4 py-3 text-sm leading-6 text-muted">
                  No verified creators are available for this field and language yet. You can still save this field and use the general roadmap.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <PlayCircle className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm leading-6 text-muted">
              Daily study time stays fixed at 1 hour so your progress remains
              consistent across every plan.
            </p>
          </div>
        </section>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {notice ? <p className="text-sm font-medium text-primary">{notice}</p> : null}

      <button className="btn-primary" disabled={isSaving} type="submit">
        <Save className="h-4 w-4" />
        {isSaving ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
};

export default SettingsPage;
