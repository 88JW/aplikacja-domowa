"use client";

import { useCallback, useEffect, useState } from "react";

type ConnectionState = "checking" | "online" | "offline" | "server-error";

type HealthResponse = {
  status: "ok" | "unavailable";
  checkedAt: string;
};

export function ConnectionStatus({ version }: { version: string }) {
  const [state, setState] = useState<ConnectionState>("checking");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setState("offline");
      setCheckedAt(new Date());
      return;
    }

    try {
      const response = await fetch("/api/health", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await response.json()) as HealthResponse;

      setState(response.ok && data.status === "ok" ? "online" : "server-error");
      setCheckedAt(new Date(data.checkedAt));
    } catch {
      setState(navigator.onLine ? "server-error" : "offline");
      setCheckedAt(new Date());
    }
  }, []);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void checkConnection(), 0);
    const interval = window.setInterval(checkConnection, 30_000);
    const handleOnline = () => void checkConnection();
    const handleOffline = () => {
      setState("offline");
      setCheckedAt(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection]);

  const labels: Record<ConnectionState, string> = {
    checking: "Sprawdzanie…",
    online: "Połączono z serwerem",
    offline: "Brak internetu",
    "server-error": "Serwer niedostępny",
  };

  return (
    <section className="planner-card app-info-card">
      <div>
        <span aria-hidden="true">⚙️</span>
        <div>
          <h2>Informacje o aplikacji</h2>
          <p>HomeApp · wersja {version}</p>
        </div>
      </div>
      <button className="connection-status" data-state={state} onClick={checkConnection} type="button">
        <i aria-hidden="true" />
        <span>
          <strong>{labels[state]}</strong>
          <small>
            {checkedAt
              ? `Sprawdzono ${checkedAt.toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : "Trwa sprawdzanie połączenia"}
          </small>
        </span>
      </button>
    </section>
  );
}
