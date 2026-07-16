import { Bot, ShieldCheck } from "lucide-react";
import ChatBox from "../components/ChatBox";

const LearningAssistantPage = () => (
  <div className="space-y-6">
    <header className="panel relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_5%_100%,rgba(217,70,239,0.16),transparent_34%)]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-white shadow-[0_0_32px_rgba(34,211,238,0.24)]">
            <Bot className="h-7 w-7" />
          </span>
          <div>
            <p className="subtle-label">Context-aware support</p>
            <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">Learning Assistant</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">Get focused, beginner-friendly help with computer science, development, data and AI topics, resumes, projects, and internship preparation.</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100">
          <ShieldCheck className="h-4 w-4" />
          Plain text responses
        </span>
      </div>
    </header>
    <ChatBox />
  </div>
);

export default LearningAssistantPage;
