"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

type TaskOption = {
  id: string;
  label: string;
  searchText: string;
};

type SpeechRecognitionResultEvent = Event & {
  results: {
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
    length: number;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .trim();
}

const ignoredSpeechWords = new Set([
  "a", "ale", "co", "do", "dzis", "i", "ja", "juz", "mam", "mi", "na",
  "po", "prosze", "sie", "ten", "to", "w", "wykonalem", "wykonalam", "zrobilem",
  "zrobilam", "zrobione", "ze",
]);

function getSpeechMatch(transcript: string, options: TaskOption[]) {
  const spoken = normalize(transcript);
  const spokenWords = spoken.split(/[^\p{L}\p{N}]+/u).filter(
    (word) => word.length > 1 && !ignoredSpeechWords.has(word),
  );

  const ranked = options
    .map((option) => {
      const searchable = normalize(option.searchText);
      const taskWords = searchable.split(/[^\p{L}\p{N}]+/u);
      const matchingWords = spokenWords.filter((word) =>
        taskWords.some((taskWord) =>
          taskWord.startsWith(word.slice(0, Math.min(word.length, 5))) ||
          word.startsWith(taskWord.slice(0, Math.min(taskWord.length, 5))),
        ),
      ).length;
      const exactBonus = searchable.includes(spoken) || spoken.includes(searchable) ? 3 : 0;
      return { option, score: matchingWords + exactBonus };
    })
    .sort((left, right) => right.score - left.score);

  const [best, second] = ranked;
  return best && best.score >= 2 && best.score > (second?.score ?? 0)
    ? best.option
    : null;
}

export function QuickTaskCompletion({ options }: { options: TaskOption[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  const [missingTaskName, setMissingTaskName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = normalize(query);
  const suggestions = useMemo(
    () =>
      normalizedQuery
        ? options
            .filter((option) => normalize(option.searchText).includes(normalizedQuery))
            .slice(0, 6)
        : [],
    [normalizedQuery, options],
  );

  function selectTask(task: TaskOption) {
    setSelectedId(task.id);
    setQuery(task.label);
    setMissingTaskName("");
  }

  function startListening() {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSpeechStatus("Ta przeglądarka nie obsługuje rozpoznawania mowy. Użyj Chrome na telefonie lub komputerze.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "pl-PL";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript.trim();
      if (!transcript) return;

      const matchedTask = getSpeechMatch(transcript, options);
      setQuery(transcript);
      if (!matchedTask) {
        setSelectedId("");
        setMissingTaskName(transcript);
        setSpeechStatus(`Usłyszeliśmy: „${transcript}”. Wybierz zadanie z podpowiedzi.`);
        return;
      }

      selectTask(matchedTask);
      setSpeechStatus(`Usłyszeliśmy: „${transcript}”. Zapisujemy: ${matchedTask.label}`);
      window.setTimeout(() => inputRef.current?.form?.requestSubmit(), 250);
    };
    recognition.onerror = (event) => {
      setSpeechStatus(
        event.error === "not-allowed"
          ? "Brak dostępu do mikrofonu. Zezwól na niego w ustawieniach przeglądarki."
          : "Nie udało się rozpoznać wypowiedzi. Spróbuj ponownie.",
      );
    };
    recognition.onend = () => setIsListening(false);

    setSpeechStatus("Słucham… powiedz, co zostało zrobione.");
    setIsListening(true);
    recognition.start();
  }

  return (
    <div className="quick-task-picker">
      <input name="taskTemplateId" type="hidden" value={selectedId} />
      <label htmlFor="quick-task-input">Co zrobiłeś?</label>
      <div className="quick-task-entry">
        <input
          autoComplete="off"
          id="quick-task-input"
          ref={inputRef}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId("");
            setMissingTaskName("");
          }}
          placeholder="Np. podlałem kwiaty…"
          type="search"
          value={query}
        />
        <button
          aria-label={isListening ? "Trwa rozpoznawanie mowy" : "Powiedz, co zostało zrobione"}
          className={`voice-button${isListening ? " is-listening" : ""}`}
          disabled={isListening}
          onClick={startListening}
          title="Powiedz, co zostało zrobione"
          type="button"
        >
          <span aria-hidden="true">🎙️</span>
          <span>{isListening ? "Słucham…" : "Powiedz"}</span>
        </button>
        <button className="primary-button" disabled={!selectedId} type="submit">
          Zapisz ✓
        </button>
      </div>
      {speechStatus && <p className="quick-task-speech-status" role="status">{speechStatus}</p>}
      {missingTaskName && (
        <div className="quick-task-add-missing">
          <p>Nie ma takiego obowiązku w katalogu?</p>
          <Link
            className="secondary-button"
            href={`/app/catalog?add=${encodeURIComponent(missingTaskName)}#new-task`}
          >
            Dodaj obowiązek „{missingTaskName}”
          </Link>
        </div>
      )}
      {normalizedQuery && !selectedId && (
        <div className="quick-task-suggestions" role="listbox" aria-label="Podpowiedzi zadań">
          {suggestions.length > 0 ? (
            suggestions.map((task) => (
              <button key={task.id} onClick={() => selectTask(task)} type="button">
                {task.label}
              </button>
            ))
          ) : (
            <p>Nie znaleźliśmy pasującego zadania w katalogu.</p>
          )}
        </div>
      )}
    </div>
  );
}
