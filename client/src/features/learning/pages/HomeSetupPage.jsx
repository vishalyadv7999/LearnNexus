import { ArrowRight, Languages, PlayCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchChannels, fetchCourses } from "../../auth/api/auth";
import { useAuth } from "../../../hooks/useAuth";
import {
  creatorOptionsByLanguage,
  fallbackChannelsByLanguage,
  fallbackFields,
  normalizeCreatorPreference,
} from "../config/preferenceOptions";

const HomeSetupPage = () => {
  const { user, updatePreferences } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [channels, setChannels] = useState([]);
  const [form, setForm] = useState({
    course: user?.course || "Software Engineering",
    videoLanguage: user?.preferences?.videoLanguage || "English",
    preferredChannels: user?.preferences?.preferredChannels || [],
    preferredSubjects: [],
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const setupRequestRef = useRef(0);

  useEffect(() => {
    const requestId = setupRequestRef.current + 1;
    setupRequestRef.current = requestId;
    let isActive = true;

    const loadSetupData = async () => {
      try {
        const [{ data: courseData }, { data: channelData }] = await Promise.all([
          fetchCourses(),
          fetchChannels(form.videoLanguage, form.course),
        ]);
        if (!isActive || requestId !== setupRequestRef.current) {
          return;
        }
        setFields(courseData.courses.map((course) => course.name));
        setChannels(channelData.channels);
      } catch (_error) {
        if (!isActive || requestId !== setupRequestRef.current) {
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

    loadSetupData();

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

  const handleLanguageChange = (videoLanguage) => {
    setForm((current) => ({
      ...current,
      videoLanguage,
      preferredChannels: [],
      preferredSubjects: [],
    }));
  };

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

    if (!form.course) {
      setError("Select the field you want to study.");
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
      navigate("/study-plan");
    } catch (saveError) {
      setError(
        saveError.response?.data?.message ||
          "We couldn't save your learning setup."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="panel space-y-4">
        <p className="subtle-label">Start learning</p>
        <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">
          Choose your field, language, and YouTube channel.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted">
          LearnNexus will give you one 1-hour video task every day and update
          progress automatically after your study session. Pick a creator for
          strict recommendations.
        </p>
      </section>

      <form className="grid gap-6 lg:grid-cols-[1fr_1fr]" onSubmit={handleSubmit}>
        <section className="panel space-y-4">
          <div>
            <p className="subtle-label">Field</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">
              What do you want to become?
            </h2>
          </div>

          <div className="grid gap-3">
            {fields.map((field) => (
              <button
                className={`rounded-2xl border px-4 py-4 text-left font-semibold transition ${
                  form.course === field
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-line bg-white text-ink hover:border-primary/30"
                }`}
                key={field}
                onClick={() => setForm((current) => ({ ...current, course: field }))}
                type="button"
              >
                {field}
              </button>
            ))}
          </div>
        </section>

        <section className="panel space-y-5">
          <div>
            <p className="subtle-label">Language</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">
              Pick how you want to study
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {["English", "Hindi"].map((language) => (
              <button
                className={`rounded-2xl border px-4 py-4 font-semibold transition ${
                  form.videoLanguage === language
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-line bg-white text-ink hover:border-primary/30"
                }`}
                key={language}
                onClick={() => handleLanguageChange(language)}
                type="button"
              >
                <Languages className="mb-2 h-5 w-5" />
                {language}
              </button>
            ))}
          </div>

          <div>
            <p className="subtle-label">Study by creator</p>
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
                  No verified creators are available for this field and language yet. You can still start learning with the general roadmap.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <PlayCircle className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm leading-6 text-muted">
              Daily learning is fixed to 1 hour. After that session completes,
              your progress updates automatically.
            </p>
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <button className="btn-primary w-full" disabled={isSaving} type="submit">
            <ArrowRight className="h-4 w-4" />
            {isSaving ? "Saving..." : "Start Learning"}
          </button>
        </section>
      </form>
    </div>
  );
};

export default HomeSetupPage;
