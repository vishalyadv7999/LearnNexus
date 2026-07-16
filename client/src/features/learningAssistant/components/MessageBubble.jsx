import { Bot, UserRound } from "lucide-react";

const safeText = (value) =>
  String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

const renderContent = (content) => {
  const text = safeText(content);
  const parts = text.split(/```([\w-]*)\n?([\s\S]*?)```/g);

  return parts.map((part, index) => {
    const isCodeLanguage = index % 3 === 1;
    const isCodeBody = index % 3 === 2;

    if (isCodeLanguage) {
      return null;
    }

    if (isCodeBody) {
      const language = parts[index - 1]?.trim();

      return (
        <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/70" key={`code-${index}`}>
          {language ? (
            <div className="border-b border-white/10 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
              {language}
            </div>
          ) : null}
          <pre className="max-w-full overflow-x-auto p-3 text-xs leading-5 text-cyan-50">
            <code>{part.trim()}</code>
          </pre>
        </div>
      );
    }

    if (!part) {
      return null;
    }

    return (
      <p className="whitespace-pre-wrap break-words" key={`text-${index}`}>
        {part}
      </p>
    );
  });
};

const MessageBubble = ({ message }) => {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}>
      {isAssistant ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-white">
          <Bot className="h-4 w-4" />
        </span>
      ) : null}
      <div
        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg sm:max-w-[76%] ${
          isAssistant
            ? "rounded-tl-md border border-white/10 bg-white/[0.065] text-slate-100"
            : "rounded-tr-md bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white"
        }`}
      >
        <div className="space-y-2">{renderContent(message.content)}</div>
      </div>
      {!isAssistant ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
          <UserRound className="h-4 w-4" />
        </span>
      ) : null}
    </article>
  );
};

export default MessageBubble;
