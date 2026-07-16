import {
  Building2,
  Calculator,
  FileCheck2,
  MessagesSquare,
  Route,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  { title: "Preparation roadmaps", description: "DSA, frontend, backend, full-stack, AI/ML, and data science paths.", to: "/internship-prep/roadmaps", icon: Route },
  { title: "Interview questions", description: "HR, technical, project explanation, and campus placement prompts.", to: "/internship-prep/questions", icon: MessagesSquare },
  { title: "Resume guide", description: "A practical checklist, ATS-friendly guidance, and project storytelling.", to: "/internship-prep/resume-guide", icon: FileCheck2 },
  { title: "Aptitude preparation", description: "Quantitative, reasoning, verbal, and data interpretation practice.", to: "/internship-prep/aptitude", icon: Calculator },
  { title: "Company preparation", description: "Role-focused preparation and a structured campus placement plan.", to: "/internship-prep/company-prep", icon: Building2 },
];

const InternshipPrepHome = () => (
  <div className="space-y-6">
    <header className="panel relative overflow-hidden py-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_15%_90%,rgba(217,70,239,0.18),transparent_34%)]" />
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
          <Sparkles className="h-3.5 w-3.5" />
          Internship preparation
        </div>
        <h1 className="mt-5 text-3xl font-black leading-tight text-ink sm:text-5xl">
          Prepare with a plan, not a pile of tabs.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          Choose the skill area or interview stage you need today. Each guide is focused, beginner-friendly, and separate from your LearnNexus study plan.
        </p>
      </div>
    </header>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Internship preparation guides">
      {sections.map(({ description, icon: Icon, title, to }) => (
        <Link
          className="group panel transition duration-200 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-cyan-300/[0.07]"
          key={to}
          to={to}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-cyan-400/20 text-cyan-100 ring-1 ring-white/10">
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-xl font-black text-ink group-hover:text-cyan-100">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          <span className="mt-5 inline-flex text-sm font-black text-primary">Open guide →</span>
        </Link>
      ))}
    </section>
  </div>
);

export default InternshipPrepHome;
