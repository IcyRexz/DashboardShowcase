"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
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
};

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

  async function sendMessage() {
    if (!canSend || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: prompt.trim(),
    };

    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
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
      });

      const data = (await response.json()) as ApiResponse;

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.error ?? data.answer ?? "No response returned.",
          sources: data.sources,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: error instanceof Error ? error.message : "Request failed.",
        },
      ]);
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
                className={`rounded-full px-3 py-1.5 text-sm transition ${mode === option
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
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.role === "assistant" && message.sources?.length ? (
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
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white px-4 py-4">
          <div className="mb-2 text-xs text-gray-500">{MODE_COPY[mode].hint}</div>
          <div className="flex gap-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              rows={4}
              className="min-h-[112px] flex-1 resize-none rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-400"
            />
            <Button
              type="button"
              onClick={sendMessage}
              disabled={!canSend || loading}
              className="h-auto rounded-3xl bg-emerald-600 px-4 text-white hover:bg-emerald-500 disabled:bg-gray-300"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
