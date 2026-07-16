import { CheckCircle2, Clock3 } from "lucide-react";
import InternshipPrepLayout from "../components/InternshipPrepLayout";
import ResourceState from "../components/ResourceState";
import useInternshipResource from "../hooks/useInternshipResource";
import { fetchRoadmaps } from "../services/internshipPrepApi";

const RoadmapPage = () => {
  const { data: roadmaps, error, isLoading, retry } = useInternshipResource(fetchRoadmaps);

  return (
    <InternshipPrepLayout
      description="Choose the path closest to the internship you want, then work through its stages in order."
      title="Preparation roadmaps"
    >
      <ResourceState error={error} isLoading={isLoading} onRetry={retry} />
      {roadmaps?.length ? (
        <div className="space-y-5">
          {roadmaps.map((roadmap) => (
            <section className="panel" key={roadmap.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-ink">{roadmap.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{roadmap.description}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
                  <Clock3 className="h-3.5 w-3.5" />
                  {roadmap.duration}
                </span>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {roadmap.stages.map((stage, index) => (
                  <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-4" key={stage.title}>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Stage {index + 1}</p>
                    <h3 className="mt-2 font-black text-ink">{stage.title}</h3>
                    <ul className="mt-3 space-y-2">
                      {stage.topics.map((topic) => (
                        <li className="flex gap-2 text-xs leading-5 text-muted" key={topic}>
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </InternshipPrepLayout>
  );
};

export default RoadmapPage;
