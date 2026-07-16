import { Calculator, Lightbulb } from "lucide-react";
import InternshipPrepLayout from "../components/InternshipPrepLayout";
import ResourceState from "../components/ResourceState";
import useInternshipResource from "../hooks/useInternshipResource";
import { fetchAptitude } from "../services/internshipPrepApi";

const AptitudePage = () => {
  const { data: categories, error, isLoading, retry } = useInternshipResource(fetchAptitude);

  return (
    <InternshipPrepLayout
      description="Build accuracy first, record why mistakes happen, and add timed practice only after the method is clear."
      title="Aptitude preparation"
    >
      <ResourceState error={error} isLoading={isLoading} onRetry={retry} />
      {categories?.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {categories.map((category) => (
            <section className="panel" key={category.id}>
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black text-ink">{category.title}</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {category.topics.map((topic) => (
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-ink" key={topic}>
                    {topic}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-cyan-50/80">{category.practiceTip}</p>
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </InternshipPrepLayout>
  );
};

export default AptitudePage;
