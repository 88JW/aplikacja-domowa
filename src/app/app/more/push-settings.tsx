"use client";

import { useEffect, useState } from "react";

type PushState = "checking" | "unsupported" | "blocked" | "off" | "on";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function PushSettings() {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      const frame = window.requestAnimationFrame(() => setState("unsupported"));
      return () => window.cancelAnimationFrame(frame);
    }

    if (Notification.permission === "denied") {
      const frame = window.requestAnimationFrame(() => setState("blocked"));
      return () => window.cancelAnimationFrame(frame);
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enablePush() {
    setMessage("");
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setState(permission === "denied" ? "blocked" : "off");
      setMessage("Bez zgody przeglądarki nie można wysyłać powiadomień push.");
      return;
    }

    const keyResponse = await fetch("/api/push/public-key");
    if (!keyResponse.ok) {
      setMessage("Serwer powiadomień nie jest jeszcze dostępny.");
      return;
    }

    const { publicKey } = (await keyResponse.json()) as { publicKey: string };
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      setMessage("Nie udało się zapisać tego urządzenia.");
      return;
    }

    setState("on");
    setMessage("Powiadomienia push są włączone na tym urządzeniu.");
  }

  async function disablePush() {
    setMessage("");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }

    setState("off");
    setMessage("Powiadomienia push są wyłączone na tym urządzeniu.");
  }

  async function sendTestPush() {
    setMessage("Wysyłanie testu…");
    const response = await fetch("/api/push/test", { method: "POST" });
    setMessage(
      response.ok
        ? "Test został wysłany. Powiadomienie powinno pojawić się za chwilę."
        : "Nie udało się wysłać testu.",
    );
  }

  return (
    <section className="planner-card push-settings">
      <div>
        <h2>Powiadomienia na urządzeniu</h2>
        <p>
          Otrzymuj systemowe powiadomienia, gdy ktoś przypisze Ci zadanie albo
          doda zadanie dla wszystkich.
        </p>
      </div>

      {state === "checking" && <small>Sprawdzanie urządzenia…</small>}
      {state === "unsupported" && (
        <small>Ta przeglądarka nie obsługuje powiadomień Web Push.</small>
      )}
      {state === "blocked" && (
        <small>
          Powiadomienia są zablokowane. Zmień uprawnienia strony w ustawieniach
          przeglądarki.
        </small>
      )}
      {state === "off" && (
        <button className="primary-button" onClick={enablePush} type="button">
          Włącz powiadomienia
        </button>
      )}
      {state === "on" && (
        <div className="push-actions">
          <button className="primary-button" onClick={sendTestPush} type="button">
            Wyślij test
          </button>
          <button className="secondary-button" onClick={disablePush} type="button">
            Wyłącz na tym urządzeniu
          </button>
        </div>
      )}
      {message && <small className="push-message">{message}</small>}
      <small className="form-hint">
        Na iPhonie powiadomienia Web Push wymagają zainstalowania HomeApp na
        ekranie początkowym.
      </small>
    </section>
  );
}
