"use client";

import { RotateCcw, SendHorizontal, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT, translate, type MessageKey } from "@/i18n";
import { greeting } from "@/lib/agents/mock";
import { getState, useAppState } from "@/lib/store";
import { Part } from "./ChatParts";
import { askAboutProgram, newChat, sendMessage } from "./juni-actions";

const PROMPTS: MessageKey[] = ["chat.chip.spanish", "chat.chip.italy", "chat.chip.surprise", "chat.chip.example"];

function JuniAvatar() {
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-clay-500 text-white shadow-sm">
      <Sparkles className="size-4" />
    </span>
  );
}

/** Handles deep links: /chat?program=<id> and /chat?next=1. */
export function ChatDeepLinks() {
  const params = useSearchParams();
  const router = useRouter();
  const handled = useRef<string | null>(null);
  const key = params.toString();
  useEffect(() => {
    if (!key || handled.current === key) return;
    handled.current = key;
    const program = params.get("program");
    if (program) askAboutProgram(program);
    else if (params.get("next")) sendMessage(translate(getState().profile.lang, "chat.nextPrompt"));
    router.replace("/chat", { scroll: false });
  }, [key, params, router]);
  return null;
}

export function ChatView() {
  const { t, lang } = useT();
  const messages = useAppState((s) => s.chat.messages);
  const thinking = useAppState((s) => s.chat.thinking);
  const name = useAppState((s) => s.profile.name);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  const submit = (text: string) => {
    if (!text.trim() || thinking) return;
    sendMessage(text);
    setInput("");
  };

  const shown = messages.length ? messages : [{ id: "greet", role: "juni" as const, parts: greeting(name) }];
  const lastJuni = [...shown].reverse().find((m) => m.role === "juni")?.id;

  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <header className="mb-4 flex items-center gap-3">
        <JuniAvatar />
        <div className="flex-1">
          <h1 className="h-display text-2xl font-semibold sm:text-3xl">{t("chat.title")}</h1>
          <p className="text-sm text-muted">{t("chat.subtitle")}</p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={newChat}>
            <RotateCcw aria-hidden className="size-4" />
            <span className="hidden sm:inline">{t("chat.new")}</span>
          </button>
        )}
      </header>

      <div role="log" aria-live="polite" aria-label={t("chat.title")} className="flex flex-col gap-5">
        {shown.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-white">
                <span className="sr-only">{t("chat.you")}: </span>
                {m.parts.map((p, i) => (p.type === "text" ? <p key={i}>{typeof p.text === "string" ? p.text : p.text[lang]}</p> : null))}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <JuniAvatar />
              <div className="min-w-0 flex-1 space-y-3">
                <span className="sr-only">{t("chat.juni")}: </span>
                {m.parts.map((p, i) => (
                  <div key={i} className={p.type === "text" ? "w-fit max-w-full rounded-2xl rounded-tl-md border border-line bg-white px-4 py-2.5" : ""}>
                    <Part part={p} interactive={m.id === lastJuni && !thinking} />
                  </div>
                ))}
              </div>
            </div>
          ),
        )}
        {thinking && (
          <div className="flex items-center gap-3 text-sm text-muted">
            <JuniAvatar />
            <span className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5">
              <span className="flex gap-1" aria-hidden>
                <span className="size-1.5 animate-bounce rounded-full bg-clay-500 [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-clay-500 [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-clay-500" />
              </span>
              {t("chat.thinking")}
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length === 0 && (
        <div className="mt-5 flex flex-wrap gap-2 pl-12">
          {PROMPTS.map((k) => (
            <button key={k} type="button" className="chip" onClick={() => submit(t(k))}>
              {t(k)}
            </button>
          ))}
        </div>
      )}

      <form
        className="sticky bottom-20 z-20 mt-6 flex items-end gap-2 rounded-3xl border border-line bg-white p-2 shadow-lg lg:bottom-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <label htmlFor="juni-input" className="sr-only">
          {t("chat.inputLabel")}
        </label>
        <textarea
          id="juni-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          placeholder={t("chat.placeholder")}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-muted/80"
        />
        <button type="submit" className="btn btn-primary size-11 shrink-0 rounded-full p-0" disabled={!input.trim() || thinking} aria-label={t("chat.send")}>
          <SendHorizontal aria-hidden className="size-5" />
        </button>
      </form>
    </div>
  );
}
