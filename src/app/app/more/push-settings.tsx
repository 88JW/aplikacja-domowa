"use client";

import { useEffect, useState } from "react";

type PushState = "checking" | "unsupported" | "blocked" | "off" | "on" | "error";

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(subscription),
  });
  if (!response.ok) {
    throw new Error("Nie udało się zapisać tego urządzenia. Spróbuj ponownie.");
  }
  const data = (await response.json()) as { profileName: string };
  return data.profileName;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function PushSettings() {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState("");
  const [profileName, setProfileName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      const frame = window.requestAnimationFrame(() => setState("unsupported"));
      return () => window.cancelAnimationFrame(frame);
    }

    if (Notification.permission === "denied") {
      const frame = window.requestAnimationFrame(() => setState("blocked"));
      return () => window.cancelAnimationFrame(frame);
    }

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        if (!subscription || Notification.permission !== "granted") {
          if (!cancelled) setState("off");
          return;
        }
        // A local browser subscription alone doesn't mean the server knows it.
        const owner = await saveSubscription(subscription);
        if (!cancelled) {
          setProfileName(owner);
          setState("on");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState("error");
          setMessage("Nie udało się potwierdzić zapisu urządzenia. Połącz powiadomienia ponownie.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function enablePush() {
    setMessage("");
    setBusy(true);
    try {
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
      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const owner = await saveSubscription(subscription);
      setProfileName(owner);
      setState("on");
      setMessage("Powiadomienia push są włączone na tym urządzeniu.");
    } catch {
      setState("error");
      setMessage("Nie udało się włączyć powiadomień. Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setMessage("");
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const response = await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("Subscription deletion failed");
        const unsubscribed = await subscription.unsubscribe();
        if (!unsubscribed) throw new Error("Browser unsubscribe failed");
      }

      setState("off");
      setMessage("Powiadomienia push są wyłączone na tym urządzeniu.");
    } catch {
      setMessage("Nie udało się wyłączyć powiadomień. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestPush() {
    setMessage("Wysyłanie testu…");
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setState("off");
        setMessage("Włącz powiadomienia na tym urządzeniu, aby wysłać test.");
        return;
      }
      const owner = await saveSubscription(subscription);
      setProfileName(owner);
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      const result = (await response.json()) as { error?: string };
      setMessage(response.ok
        ? "Test został wysłany. Sprawdź powiadomienia na tym urządzeniu."
        : result.error ?? "Nie udało się wysłać testu.");
    } catch {
      setMessage("Nie udało się wysłać testu. Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="planner-card push-settings">
      <div>
        <h2>Powiadomienia na urządzeniu</h2>
        <p>
          Otrzymuj systemowe powiadomienia, gdy inny domownik wykona zadanie,
          przypisze Ci zadanie albo doda zadanie dla wszystkich.
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
      {(state === "off" || state === "error") && (
        <button className="primary-button" disabled={busy} onClick={enablePush} type="button">
          {state === "error" ? "Połącz powiadomienia ponownie" : "Włącz powiadomienia"}
        </button>
      )}
      {state === "on" && (
        <>
          <small>Powiadomienia włączone dla: {profileName}</small>
          <div className="push-actions">
            <button className="primary-button" disabled={busy} onClick={sendTestPush} type="button">
              Wyślij test
            </button>
            <button className="secondary-button" disabled={busy} onClick={disablePush} type="button">
              Wyłącz na tym urządzeniu
            </button>
          </div>
        </>
      )}
      {message && <small className="push-message">{message}</small>}
      <small className="form-hint">
        Na iPhonie powiadomienia Web Push wymagają zainstalowania HomeApp na
        ekranie początkowym.
      </small>
    </section>
  );
}
