import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-mark" aria-hidden="true">
          🔒
        </div>
        <p className="eyebrow">Aplikacja domowa</p>
        <h1>Brak dostępu</h1>
        <p className="lead">
          To konto Google nie jest członkiem tego gospodarstwa domowego.
        </p>
        <Link className="inline-cta" href="https://panel.miasoftware.pl">
          Wróć do panelu
        </Link>
      </section>
    </main>
  );
}
