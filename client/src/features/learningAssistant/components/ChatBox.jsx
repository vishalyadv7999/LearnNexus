import {
  AlertTriangle,
  LoaderCircle,
  MessageCircleMore,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import {
  MAX_ASSISTANT_MESSAGE_LENGTH,
  clearLearningAssistantHistory,
  fetchLearningAssistantHistory,
  sendLearningAssistantMessage,
} from "../services/learningAssistantApi";

const suggestions = [
  "Explain JavaScript closures with a simple example.",
  "How should I explain my full-stack project in an interview?",
  "Give me a beginner-friendly DSA study plan.",
];

const errorMessageFor = (error) =>
  error.response?.data?.message ||
  "The Learning Assistant could not respond. Please check your connection and try again.";

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [failedMessage, setFailedMessage] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      setError("");
      try {
        const { data } = await fetchLearningAssistantHistory();
        if (isActive) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        }
      } catch (loadError) {
        if (isActive) {
          setError(errorMessageFor(loadError));
        }
      } finally {
        if (isActive) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();
    return () => {
      isActive = false;
    };
  }, [historyVersion]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isSending]);

  const sendMessage = useCallback(async (rawMessage, existingMessageId = null) => {
    const message = rawMessage.trim();
    if (!message || message.length > MAX_ASSISTANT_MESSAGE_LENGTH || isSending) {
      return;
    }

    const pendingId = existingMessageId || `pending-${Date.now()}`;
    if (!existingMessageId) {
      setMessages((current) => [
        ...current,
        { id: pendingId, role: "user", content: message },
      ]);
    }

    setInput("");
    setError("");
    setFailedMessage(null);
    setIsSending(true);

    try {
      const { data } = await sendLearningAssistantMessage(message);
      const savedMessages = Array.isArray(data.messages) ? data.messages : [];
      setMessages((current) => [
        ...current.filter((item) => item.id !== pendingId),
        ...savedMessages,
      ]);
    } catch (sendError) {
      setError(errorMessageFor(sendError));
      setFailedMessage({ content: message, id: pendingId });
    } finally {
      setIsSending(false);
    }
  }, [isSending]);

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleClear = async () => {
    setIsClearing(true);
    setError("");
    try {
      await clearLearningAssistantHistory();
      setMessages([]);
      setFailedMessage(null);
    } catch (clearError) {
      setError(errorMessageFor(clearError));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <section className="panel overflow-hidden p-0 sm:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <div>
          <h2 className="font-black text-ink">Learning conversation</h2>
          <p className="mt-1 text-xs font-semibold text-muted">Answers stay focused on learning and career preparation.</p>
        </div>
        <button
          className="btn-secondary px-3 py-2 text-xs"
          disabled={isClearing || messages.length === 0}
          onClick={handleClear}
          type="button"
        >
          {isClearing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Clear history
        </button>
      </div>

      <div className="min-h-[24rem] max-h-[34rem] space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {isLoadingHistory ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-bold text-muted">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            Loading your conversation...
          </div>
        ) : null}

        {!isLoadingHistory && error && messages.length === 0 && !failedMessage ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-300" />
            <p className="max-w-md text-sm leading-6 text-muted">{error}</p>
            <button className="btn-secondary" onClick={() => setHistoryVersion((value) => value + 1)} type="button">
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        {!isLoadingHistory && !error && messages.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircleMore className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-xl font-black text-ink">Ask your first question</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">Name the topic and what is confusing. A little context produces a much clearer explanation.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <button className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10" key={suggestion} onClick={() => setInput(suggestion)} type="button">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!isLoadingHistory ? messages.map((message) => <MessageBubble key={message.id} message={message} />) : null}
        {isSending ? (
          <div className="flex items-center gap-3 text-sm font-bold text-muted">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><LoaderCircle className="h-4 w-4 animate-spin text-primary" /></span>
            Writing a detailed explanation...
          </div>
        ) : null}
        {failedMessage ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
            <p className="text-sm leading-6 text-red-100">{error}</p>
            <button className="mt-3 inline-flex items-center gap-2 text-sm font-black text-white" disabled={isSending} onClick={() => sendMessage(failedMessage.content, failedMessage.id)} type="button">
              <RotateCcw className="h-4 w-4" />
              Retry this question
            </button>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form className="border-t border-white/10 p-4 sm:p-6" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="learning-assistant-message">Ask the Learning Assistant</label>
        <textarea
          className="field min-h-24 resize-y"
          disabled={isLoadingHistory || isSending}
          id="learning-assistant-message"
          maxLength={MAX_ASSISTANT_MESSAGE_LENGTH}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (input.trim()) {
                sendMessage(input);
              }
            }
          }}
          placeholder="Ask about React, DSA, DBMS, internships, your resume, or a project..."
          value={input}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-muted">{input.length}/{MAX_ASSISTANT_MESSAGE_LENGTH}</p>
          <button className="btn-primary" disabled={!input.trim() || isSending || isLoadingHistory} type="submit">
            {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </form>
    </section>
  );
};

export default ChatBox;
