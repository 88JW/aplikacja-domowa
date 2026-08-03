export default function LaunchPage() {
  return (
    <main className="shell offline-page">
      <p className="eyebrow">Nasz dom</p>
      <h1>HomeApp jest gotowy</h1>
      <p className="lead">
        Otwórz swój dom. Jeśli sesja wygasła, Google poprosi Cię o ponowne zalogowanie.
      </p>
      <a className="primary-button" href="/app">
        Otwórz aplikację
      </a>
    </main>
  );
}
