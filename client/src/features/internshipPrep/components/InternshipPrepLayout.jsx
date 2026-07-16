import { ArrowLeft, BriefcaseBusiness } from "lucide-react";
import { Link } from "react-router-dom";

const InternshipPrepLayout = ({ children, description, title }) => (
  <div className="space-y-6">
    <header className="panel relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_10%_100%,rgba(217,70,239,0.14),transparent_34%)]" />
      <div className="relative">
        <Link
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-200 transition hover:text-white"
          to="/internship-prep"
        >
          <ArrowLeft className="h-4 w-4" />
          Internship Prep
        </Link>
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-white shadow-[0_0_28px_rgba(34,211,238,0.22)]">
            <BriefcaseBusiness className="h-6 w-6" />
          </span>
          <div>
            <p className="subtle-label">Career preparation</p>
            <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
              {description}
            </p>
          </div>
        </div>
      </div>
    </header>
    {children}
  </div>
);

export default InternshipPrepLayout;
