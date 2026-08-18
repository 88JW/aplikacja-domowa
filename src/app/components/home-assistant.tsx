"use client";

import { useRef, useState } from "react";

type Action =
  | { type: "complete_task"; taskTemplateId: string; label: string }
  | { type: "mark_waste_bags"; count: number; label: string }
  | { type: "schedule_task"; taskTemplateId: string; scheduledFor: string; label: string };
type Message = { role: "user" | "assistant"; content: string; action?: Action | null };

type SpeechRecognitionLike = { lang: string; interimResults: boolean; continuous: boolean; start(): void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function HomeAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function send(message: string) {
    const text = message.trim(); if (!text || loading) return;
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    setInput(""); setMessages((items) => [...items, { role: "user", content: text }]); setLoading(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "message", message: text, history }) });
      const result = await response.json() as { reply: string; action: Action | null };
      setMessages((items) => [...items, { role: "assistant", content: result.reply, action: result.action }]);
    } catch { setMessages((items) => [...items, { role: "assistant", content: "Nie udało się połączyć z asystentem." }]); }
    finally { setLoading(false); window.setTimeout(() => inputRef.current?.focus(), 0); }
  }

  async function confirm(action: Action) {
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "execute", action }) });
      const result = await response.json() as { reply: string };
      setMessages((items) => [...items.map((item) => item.action === action ? { ...item, action: null } : item), { role: "assistant", content: result.reply }]);
    } finally { setLoading(false); }
  }

  function listen() {
    const recognitionWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition;
    if (!Recognition) { setMessages((items) => [...items, { role: "assistant", content: "Ta przeglądarka nie obsługuje rozpoznawania mowy." }]); return; }
    const recognition = new Recognition(); recognition.lang = "pl-PL"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = (event) => { const text = event.results[event.results.length - 1]?.[0]?.transcript; if (text) void send(text); };
    recognition.onerror = () => setMessages((items) => [...items, { role: "assistant", content: "Nie udało się rozpoznać głosu. Spróbuj jeszcze raz." }]);
    recognition.onend = () => setListening(false); setListening(true); recognition.start();
  }

  return <aside className={`home-assistant${open ? " is-open" : ""}`} aria-label="Domowy Asystent">
    {open && <section className="assistant-panel"><header><div><span aria-hidden="true">✨</span><strong>Domowy Asystent</strong><small>Rozmawiaj, pytaj i zlecaj</small></div><button aria-label="Zamknij asystenta" onClick={() => setOpen(false)} type="button">×</button></header>
      <div className="assistant-messages" aria-live="polite">{messages.length === 0 && <p className="assistant-welcome">Cześć! Możesz zapytać, co dawno nie było robione, poprosić o przepis albo zlecić zadanie.</p>}{messages.map((message, index) => <article className={`assistant-message ${message.role}`} key={index}><p>{message.content}</p>{message.action && <button className="primary-button" disabled={loading} onClick={() => void confirm(message.action!)} type="button">Potwierdź: {message.action.label}</button>}</article>)}{loading && <article className="assistant-message assistant"><p>Myślę…</p></article>}</div>
      <form onSubmit={(event) => { event.preventDefault(); void send(input); }}><input aria-label="Napisz do asystenta" ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Np. co dawno nie było robione?" /><button aria-label="Powiedz polecenie" className={listening ? "assistant-mic listening" : "assistant-mic"} disabled={loading || listening} onClick={listen} type="button">🎙️</button><button className="primary-button" disabled={loading || !input.trim()} type="submit">Wyślij</button></form>
    </section>}
    <button className="assistant-fab" onClick={() => { setOpen((value) => !value); window.setTimeout(() => inputRef.current?.focus(), 100); }} type="button"><span aria-hidden="true">✨</span><span>Asystent</span></button>
  </aside>;
}
