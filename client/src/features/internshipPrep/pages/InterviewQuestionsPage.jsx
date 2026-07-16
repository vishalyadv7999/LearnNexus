import { MessageCircleQuestion } from "lucide-react";
import InternshipPrepLayout from "../components/InternshipPrepLayout";
import ResourceState from "../components/ResourceState";
import useInternshipResource from "../hooks/useInternshipResource";
import { fetchQuestions } from "../services/internshipPrepApi";

const sectionLabels = {
  hr: "HR interview questions",
  technical: "Technical interview questions",
  projectExplanation: "Project explanation preparation",
  campusPlacement: "Campus placement preparation",
};

const InterviewQuestionsPage = () => {
  const { data: questionGroups, error, isLoading, retry } = useInternshipResource(fetchQuestions);

  return (
    <InternshipPrepLayout
      description="Practice the structure of a strong answer, then replace the examples with your own truthful experience."
      title="Interview question practice"
    >
      <ResourceState error={error} isLoading={isLoading} onRetry={retry} />
      {questionGroups ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {Object.entries(questionGroups).map(([group, questions]) => (
            <section className="panel" key={group}>
              <div className="flex items-center gap-3">
                <MessageCircleQuestion className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black text-ink">{sectionLabels[group]}</h2>
              </div>
              <div className="mt-5 space-y-3">
                {questions.map(({ guidance, question }, index) => (
                  <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-4" key={question}>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Question {index + 1}</p>
                    <h3 className="mt-2 font-black leading-6 text-ink">{question}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{guidance}</p>
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

export default InterviewQuestionsPage;
