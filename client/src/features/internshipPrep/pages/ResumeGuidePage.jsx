import { Check, FileSearch, Presentation } from "lucide-react";
import InternshipPrepLayout from "../components/InternshipPrepLayout";
import ResourceState from "../components/ResourceState";
import useInternshipResource from "../hooks/useInternshipResource";
import { fetchResumeGuide } from "../services/internshipPrepApi";

const GuideList = ({ icon: Icon, items, title }) => (
  <section className="panel">
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-black text-ink">{title}</h2>
    </div>
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-muted" key={item}>
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="h-3 w-3" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  </section>
);

const ResumeGuidePage = () => {
  const { data: guide, error, isLoading, retry } = useInternshipResource(fetchResumeGuide);

  return (
    <InternshipPrepLayout
      description="Make your resume easy for both a recruiter and an applicant tracking system to understand—without adding claims you cannot support."
      title="Resume and ATS guide"
    >
      <ResourceState error={error} isLoading={isLoading} onRetry={retry} />
      {guide ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <GuideList icon={Check} items={guide.checklist} title="Resume checklist" />
          <GuideList icon={FileSearch} items={guide.atsTips} title="ATS-friendly resume tips" />
          <div className="xl:col-span-2">
            <GuideList icon={Presentation} items={guide.projectExplanation} title="Project explanation framework" />
          </div>
        </div>
      ) : null}
    </InternshipPrepLayout>
  );
};

export default ResumeGuidePage;
