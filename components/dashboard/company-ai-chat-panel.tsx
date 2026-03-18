"use client";

import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Bot, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SustainabilityCompany } from "@/data/sustainability";

type ChatIntent = "EXTRACTION_EXPLANATION" | "ANOMALY_EXPLANATION";

type ApiResponse = {
  intent?: ChatIntent;
  answer?: string;
  error?: string;
  sources?: string[];
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  isLoading?: boolean;
};

const MIN_THINKING_MS = 1500;

const MODE_COPY: Record<
  ChatIntent,
  {
    label: string;
    template: string;
    hint: string;
  }
> = {
  EXTRACTION_EXPLANATION: {
    label: "Extraction",
    template: "Explain how ___ was derived from the extraction output.",
    hint: "Mention a metric like water, emissions, energy, fuel, waste, or gfa.",
  },
  ANOMALY_EXPLANATION: {
    label: "Anomaly",
    template: "Explain why this company was flagged as an anomaly.",
    hint: "Ask why the company was flagged or why the anomaly model marked it for review.",
  },
};

function buildIntroMessage(company: SustainabilityCompany): ChatMessage {
  return {
    id: 1,
    role: "assistant",
    content: `Ask about ${company.name}. I already know the company context and report year ${company.reportYear}.`,
  };
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.92em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-current">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderStructuredMessage(content: string) {
  const lines = content.split("\n");

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={`spacer-${index}`} className="h-1" />;
        }

        const headingMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
        if (headingMatch) {
          return (
            <div
              key={`heading-${index}`}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-current/70"
            >
              {headingMatch[1]}
            </div>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <div key={`bullet-${index}`} className="flex gap-2">
              <span className="pt-0.5 text-current/50">•</span>
              <div className="flex-1">{renderInlineFormatting(trimmed.slice(2))}</div>
            </div>
          );
        }

        return (
          <div key={`line-${index}`} className="leading-7">
            {renderInlineFormatting(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

interface CompanyAiChatPanelProps {
  company: SustainabilityCompany;
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyAiChatPanel({
  company,
  isOpen,
  onClose,
}: CompanyAiChatPanelProps) {
  const [mode, setMode] = useState<ChatIntent>("EXTRACTION_EXPLANATION");
  const [prompt, setPrompt] = useState(MODE_COPY.EXTRACTION_EXPLANATION.template);
  const [messages, setMessages] = useState<ChatMessage[]>([buildIntroMessage(company)]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([buildIntroMessage(company)]);
    setMode("EXTRACTION_EXPLANATION");
    setPrompt(MODE_COPY.EXTRACTION_EXPLANATION.template);
  }, [company]);

  const canSend = prompt.trim().length > 0;

  const title = useMemo(() => `${company.name} AI`, [company.name]);

  function switchMode(nextMode: ChatIntent) {
    setMode(nextMode);
    setPrompt(MODE_COPY[nextMode].template);
  }

  function scrollToLatestMessage() {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }

  useEffect(() => {
    if (!isOpen) return;
    scrollToLatestMessage();
  }, [messages, isOpen]);

  async function sendMessage() {
    if (!canSend || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: prompt.trim(),
    };

    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    const loadingMessageId = Date.now() + 1;
    setMessages((current) => [
      ...current,
      {
        id: loadingMessageId,
        role: "assistant",
        content: "",
        isLoading: true,
      },
    ]);

    try {
      const [data] = await Promise.all([
        fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: prompt.trim(),
            context: {
              intent: mode,
              company: company.name,
              year: company.reportYear,
            },
          }),
        }).then(async (response) => (await response.json()) as ApiResponse),
        new Promise((resolve) => setTimeout(resolve, MIN_THINKING_MS)),
      ]);

      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessageId
            ? {
              ...message,
              content: data.error ?? data.answer ?? "No response returned.",
              sources: data.sources,
              isLoading: false,
            }
            : message,
        ),
      );
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessageId
            ? {
              ...message,
              content: error instanceof Error ? error.message : "Request failed.",
              isLoading: false,
            }
            : message,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <aside
      className={`min-h-0 border-l border-gray-200 bg-[linear-gradient(180deg,_rgba(16,185,129,0.08),_rgba(255,255,255,0.96))] transition-all duration-300 ease-out ${isOpen
        ? "w-[min(48vw,640px)] opacity-100"
        : "pointer-events-none w-0 opacity-0"
        }`}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                Company AI
              </div>
              <h3 className="mt-1 text-base font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-xs text-gray-500">
                Context is fixed to {company.name} ({company.reportYear})
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close AI chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex gap-2">
            {(Object.keys(MODE_COPY) as ChatIntent[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchMode(option)}
                className={`rounded-full px-3 py-1 text-sm transition ${mode === option
                  ? "bg-emerald-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {MODE_COPY[option].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div
                  className={`max-w-[94%] rounded-3xl px-4 py-3 text-sm leading-6 ${message.role === "user"
                    ? "ml-auto bg-emerald-600 text-white"
                    : "border border-gray-200 bg-white text-gray-800"
                    }`}
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-current/60">
                    {message.role === "user" ? (
                      <MessageSquare className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                    {message.role}
                  </div>
                  {message.isLoading ? (
                    <div className="flex items-center gap-1 py-1 text-sm text-current/80">
                      <span>Thinking</span>
                      <span className="inline-flex w-6 justify-start">
                        <span className="animate-pulse [animation-delay:0ms]">.</span>
                        <span className="animate-pulse [animation-delay:200ms]">.</span>
                        <span className="animate-pulse [animation-delay:400ms]">.</span>
                      </span>
                    </div>
                  ) : (
                    renderStructuredMessage(message.content)
                  )}
                </div>

                {message.role === "assistant" && !message.isLoading && message.sources?.length ? (
                  <div className="max-w-[94%] rounded-2xl border border-gray-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                      Sources
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.sources.map((source) => (
                        <span
                          key={source}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="mb-2 text-xs text-gray-500">{MODE_COPY[mode].hint}</div>
          <div className="flex items-stretch gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              rows={2}
              className="min-h-[72px] flex-1 resize-none rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-400"
            />
            <Button
              type="button"
              onClick={sendMessage}
              disabled={!canSend || loading}
              className="min-h-[72px] rounded-3xl bg-emerald-600 px-4 text-white hover:bg-emerald-500 disabled:bg-gray-300"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
