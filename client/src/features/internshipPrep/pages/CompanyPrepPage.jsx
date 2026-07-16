import { Building2, CheckCircle2, Info } from "lucide-react";
import InternshipPrepLayout from "../components/InternshipPrepLayout";
import ResourceState from "../components/ResourceState";
import useInternshipResource from "../hooks/useInternshipResource";
import { fetchCompanyPrep } from "../services/internshipPrepApi";

const CompanyPrepPage = () => {
  const { data: prep, error, isLoading, retry } = useInternshipResource(fetchCompanyPrep);

  return (
    <InternshipPrepLayout
      description="Start from the role's skills instead of memorizing an assumed hiring pattern, then tailor your weekly practice."
      title="Company-wise preparation"
    >
      <ResourceState error={error} isLoading={isLoading} onRetry={retry} />
      {prep ? (
        <>
          <div className="flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            {prep.note}
          </div>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {prep.companies.map((company) => (
              <article className="panel" key={company.id}>
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-black text-ink">{company.name}</h2>
                </div>
                <ul className="mt-4 space-y-2">
                  {company.focus.map((item) => (
                    <li className="flex gap-2 text-sm text-muted" key={item}>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 rounded-2xl bg-white/[0.045] p-4 text-sm leading-6 text-muted">{company.plan}</p>
              </article>
            ))}
          </section>
          <section className="panel">
            <h2 className="text-xl font-black text-ink">Campus placement preparation plan</h2>
            <ol className="mt-5 grid gap-3 md:grid-cols-2">
              {prep.campusPlan.map((step, index) => (
                <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-muted" key={step}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </InternshipPrepLayout>
  );
};

export default CompanyPrepPage;
