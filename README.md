# HomeApp — aplikacja domowych obowiązków

HomeApp to prywatna aplikacja PWA do planowania i rejestrowania obowiązków
domowych. Pomaga dzielić większe prace na małe czynności, przypisywać je
domownikom oraz motywować do działania za pomocą punktów, rankingów,
osiągnięć i wspólnych wyzwań.

Wersja produkcyjna działa pod adresem:

**https://homeapp.miasoftware.pl**

Dokumentacja odpowiada wersji produkcyjnej z 19 lipca 2026 r.

## Użytkownicy i dostęp

Aplikacja korzysta z centralnego logowania Google SSO działającego przed
aplikacjami w domenie `miasoftware.pl`.

Aktualnie dostęp mają tylko:

- Wojtek — `w.jaskula8@gmail.com`,
- Iza — `iza.hille@gmail.com`.

Adres `derastro@gmail.com` jest aliasem logowania Wojtka. Po wejściu przez ten
adres aplikacja używa tego samego profilu i tych samych punktów co
`w.jaskula8@gmail.com`; nie powstaje dodatkowy domownik.

Po zalogowaniu można przełączać aktywnego domownika. Dzięki temu jedno wspólne
urządzenie, np. tablet, może służyć obojgu bez wylogowywania się z Google.
Wybrany profil jest zapamiętywany na urządzeniu:

- czynności wykonane jako Iza naliczają punkty, skróty, osiągnięcia i
  powiadomienia Izy,
- czynności wykonane jako Wojtek trafiają do profilu Wojtka,
- przełącznik pozwala wybrać wyłącznie członka tego samego gospodarstwa,
- profil Izy korzysta z zielonego motywu, a profil Wojtka z niebieskiego.

Interfejs ma charakter domowego, ręcznie rysowanego notesu: papierowe tło,
odręczne nagłówki, szkicowane obramowania, lekko nieregularne karty i przyciski
oraz nawigację przypominającą przyklejoną kartkę. Styl nie zmienia działania
formularzy ani układu danych i respektuje ustawienie ograniczenia animacji w
systemie.

Sesja Google jest współdzielona z pozostałymi aplikacjami obsługiwanymi przez
centralny mechanizm SSO. HomeApp dodatkowo sprawdza własną listę dozwolonych
adresów e-mail.

## Najważniejsze zasady

- Każda wykonana czynność daje dokładnie 1 punkt.
- Punkty nie są zapisywane jako osobne saldo — są obliczane z aktywnych wpisów
  historii.
- Usunięcie omyłkowego wykonania automatycznie odejmuje punkt ze wszystkich
  zestawień.
- Punkty i osiągnięcia są prezentowane w okresach tygodniowych i miesięcznych.
- Miesięczne osiągnięcia zaczynają się od nowa pierwszego dnia miesiąca.
- Wykonania z poprzednich okresów pozostają w historii.
- Użytkownicy widzą swoje wyniki i aktywność pozostałych domowników.

## Model zadania

Aplikacja rozdziela trzy pojęcia:

1. **Szablon zadania** — pozycja w katalogu, np. „Umyć podłogę w salonie”.
2. **Zaplanowane zadanie** — konkretne wystąpienie na wybrany dzień.
3. **Wykonanie** — zapis kto, co i kiedy zrobił oraz otrzymany punkt.

Duże obowiązki są dzielone na małe czynności. Pranie może więc składać się
z osobnych zadań:

- wstawienie prania,
- rozwieszenie,
- zdjęcie suchego prania,
- poskładanie,
- pochowanie,
- prasowanie.

## Przestrzenie i czynności

W interfejsie nie używamy kategorii. Każde zadanie opisują dwa proste pytania:

- **Gdzie?** — jedna lub kilka przestrzeni,
- **Co robisz?** — jeden lub kilka rodzajów czynności.

### Przestrzenie

- Kuchnia
- Łazienka
- Ogród
- Salon
- Sypialnia
- Cały dom
- Parter
- Piętro

Katalog zawiera również dokładne przestrzenie mapy: pomieszczenia parteru i
piętra, garaż, schowek oraz poszczególne części ogrodu.

### Rodzaje czynności

- Mycie
- Odkurzanie
- Ścieranie kurzu
- Porządkowanie
- Pranie
- Naczynia i zmywarka
- Odpady
- Opieka nad zwierzętami
- Podlewanie roślin

Jedno wykonanie może zwiększyć postęp kilku wyzwań jednocześnie.

Przykład:

> „Umyć podłogę w salonie” zalicza się do wyzwania Mycie, wyzwania Salon oraz
> połączonego wyzwania Mycie + Salon.

Podczas dodawania i edycji zadania trzeba wskazać co najmniej jedną przestrzeń
albo czynność. Istniejące zadania zostały wcześniej automatycznie przeniesione
do nowego modelu. Stara tabela kategorii pozostaje wyłącznie jako warstwa
zgodności historycznych migracji i nie jest używana przez interfejs.

## Planowanie

Zadanie można:

- zaplanować na wybrany dzień,
- przypisać Wojtkowi albo Izie,
- pozostawić dostępne dla wszystkich,
- ustawić jako jednorazowe,
- powtarzać codziennie,
- powtarzać raz w tygodniu,
- powtarzać co 4 dni od ostatniego wykonania.

Pole „Szukaj zadania” filtruje listę na żywo po nazwie, przestrzeni i rodzaju
czynności. Klasyczna lista wyboru pozostaje pod polem wyszukiwania. Ten sam
mechanizm działa przy dodawaniu osobistego szybkiego skrótu.

Jeżeli zadanie jest przeznaczone dla wszystkich, widzą je obie osoby.
Pierwsza osoba, która oznaczy je jako wykonane, otrzymuje punkt i zamyka
zadanie.

Po usunięciu wykonania zadanie planowane wraca do stanu „do wykonania”.

## Szybkie zadania

Każdy użytkownik ma własny zestaw skrótów na stronie głównej.

Skrót:

- jest widoczny tylko dla właściciela,
- wskazuje zadanie z katalogu,
- pozwala dodać niezaplanowane wykonanie jednym kliknięciem,
- może zostać usunięty bez usuwania zadania z katalogu.

Na stronie głównej można też wybrać przycisk **„Powiedz”** przy polu „Co
zrobiłeś?”. Przeglądarka rozpoznaje wypowiedź po polsku i porównuje ją z
istniejącym katalogiem obowiązków. Gdy dopasowanie jest jednoznaczne, HomeApp
automatycznie zapisuje wykonanie; w przeciwnym razie pokazuje tekst i zwykłe
podpowiedzi do ręcznego wyboru. Przy braku dopasowania wyświetla też przycisk
„Dodaj obowiązek”, który otwiera zwykły formularz katalogu z wypełnioną nazwą
rozpoznanej czynności. Funkcja wymaga zgody na mikrofon i obsługi Web Speech
API przez przeglądarkę (najpewniej działa w Chrome). Rozpoznawanie mowy
realizuje przeglądarka — aplikacja nie zapisuje nagrań audio.

## Domowy Asystent

Pływający przycisk **Asystent** jest dostępny na każdej stronie aplikacji.
Można pisać lub mówić po polsku; rozmowa bieżącej sesji pozostaje tylko w
otwartym panelu i nie jest zapisywana jako historia czatu w bazie.

Asystent korzysta z Gemini wyłącznie po stronie serwera. Do modelu trafia
wiadomość użytkownika oraz potrzebne dane HomeApp, takie jak katalog zadań,
ostatnie wykonania, plan na dziś i liczba wystawionych worków. Klucz API
pozostaje w `.env.production` na serwerze i nie jest wysyłany do przeglądarki.

Pierwszy etap pozwala odpowiadać na pytania o dom i zwykłe pytania, np. o
potrawy ze wskazanych składników, oraz przygotować do zatwierdzenia:

- zapisanie wykonanego zadania,
- oznaczenie kolejnych worków na śmieci,
- zaplanowanie zadania na konkretny dzień.

Każda zmiana danych z panelu wymaga przycisku **Potwierdź**. Asystent nie ma
dostępu do haseł, kluczy API, terminala, bazy jako dowolnego SQL ani do
usuwania danych. Późniejsze integracje Zigbee, ESP32 i serwerów dodajemy jako
osobne, ograniczone narzędzia (np. odczyt czujnika lub sprawdzenie stanu
serwera), również z potwierdzeniem dla działań zmieniających stan.

## Historia i korekty

Historia pokazuje aktywne i cofnięte wykonania wszystkich domowników. Każdy
domownik może skorygować wpis Wojtka lub Izy — przyciskiem **Usuń** albo
**Przywróć**.

Usunięcie:

- ukrywa wykonanie z aktywnej historii,
- odejmuje punkt,
- aktualizuje rankingi i tabelę wyników,
- ponownie przelicza osiągnięcia,
- przywraca powiązane zadanie planowane.

Wpis nie jest fizycznie kasowany z bazy. Otrzymuje datę cofnięcia w polu
`undone_at`, pozostaje widoczny w historii i można go przywrócić. Przywrócenie
ponownie nalicza punkt, aktualizuje wyniki i osiągnięcia oraz oznacza powiązane
zadanie planowane jako wykonane. Nie można przywrócić starego wpisu zadania
planowanego, jeśli to samo zadanie zostało już później wykonane ponownie.

## Powiadomienia

HomeApp posiada dwa kanały powiadomień:

- trwałe centrum powiadomień wewnątrz aplikacji,
- opcjonalne powiadomienia systemowe PWA Web Push.

Przy zaplanowaniu zadania:

- osoba wskazana w polu przypisania otrzymuje powiadomienie,
- przy zadaniu dla wszystkich powiadomienie otrzymują pozostali domownicy,
- osoba planująca nie dostaje komunikatu o własnej operacji,
- kliknięcie komunikatu prowadzi do planu na właściwy dzień.

Harmonogram uruchamiany co godzinę przygotowuje również przypomnienia:

- rano o zadaniach czekających na dziś,
- po godzinie 18:00 o zadaniach zaplanowanych na jutro,
- osobnym komunikatem o podlewaniu kwiatów na parterze lub piętrze.

Klucze deduplikacji sprawiają, że ponowne uruchomienie harmonogramu nie tworzy
drugiego identycznego powiadomienia.

Dolna nawigacja pokazuje licznik nieprzeczytanych alertów. W centrum
powiadomień można oznaczyć pojedynczy wpis albo wszystkie wpisy jako
przeczytane.

### Włączenie Web Push

1. Otwórz `Więcej`.
2. W sekcji „Powiadomienia na urządzeniu” wybierz „Włącz powiadomienia”.
3. Zaakceptuj pytanie przeglądarki.
4. Użyj przycisku „Wyślij test”.

Subskrypcja jest zapisywana osobno dla każdego urządzenia. Można ją wyłączyć
bez wpływu na centrum powiadomień wewnątrz aplikacji. Wygasłe subskrypcje są
automatycznie usuwane po odpowiedzi `404` albo `410` od usługi push.

Na iPhonie Web Push wymaga zainstalowania HomeApp na ekranie początkowym.
Klucze VAPID są przechowywane wyłącznie w `.env.production` i nie powinny być
zmieniane bez potrzeby, ponieważ urządzenia musiałyby zapisać się ponownie.

## Strona główna

Strona główna zawiera:

- punkty zalogowanego użytkownika w bieżącym tygodniu,
- punkty całego domu,
- liczbę zadań na dzisiaj,
- status podlewania kwiatów na parterze i piętrze,
- czas od ostatniego podlania oraz termin kolejnego,
- indywidualną i wspólną serię aktywności,
- osobiste szybkie zadania,
- sześć najważniejszych osiągnięć,
- tabelę „Kto co zrobił”,
- listę zadań na dzisiaj,
- sekcję wspólnego wyzwania.

Tabela „Kto co zrobił” ma zadania w wierszach oraz kolumny:

- Iza,
- Wojtek,
- Razem.

## Rankingi

Aplikacja oblicza rankingi na podstawie niecofniętych wykonań:

- tygodniowy,
- miesięczny.

Każde wykonanie jest warte 1 punkt. Po usunięciu wpisu wszystkie zestawienia
są aktualizowane automatycznie.

## Osiągnięcia i wyzwania

Osiągnięcia są liczone w bieżącym miesiącu. Po korekcie historii odznaka może
zostać odebrana, jeśli jej warunek nie jest już spełniony.

Ekran osiągnięć jest podzielony na pięć sekcji.

### Główne osiągnięcia

Obejmują między innymi:

- pierwsze zadanie,
- 10 wykonanych zadań,
- zadania z 5 różnymi przestrzeniami lub czynnościami,
- aktywność przez 3 kolejne dni,
- 25 zadań całego domu,
- aktywność każdego domownika w bieżącym tygodniu.

### Pory dnia

Godziny są obliczane w strefie `Europe/Warsaw`.

| Wyzwanie | Godziny | Próg miesięczny |
|---|---:|---:|
| Poranny rozruch | 05:00–10:00 | 5 |
| Południowy pomocnik | 10:00–14:00 | 5 |
| Popołudniowa energia | 14:00–18:00 | 5 |
| Wieczorny finisz | 18:00–23:00 | 5 |
| Nocna zmiana | 23:00–05:00 | 3 |

### Przestrzenie

Odznaka przestrzeni wymaga 5 wykonań oznaczonych daną przestrzenią w
bieżącym miesiącu.

### Czynności

Odznaka czynności wymaga 5 wykonań oznaczonych danym rodzajem pracy w
bieżącym miesiącu.

Szczegółowe etapy prania oraz koszenie mają próg 3 wykonań:

- rozwieszanie prania,
- składanie ubrań,
- prasowanie,
- chowanie ubrań,
- koszenie trawy.

Wybrane osiągnięcia korzystają z własnych ilustracji PNG znajdujących się w
`public/images/achievements`. Jeśli definicja nie posiada ilustracji,
interfejs nadal używa zapasowej ikony emoji.

### Połączenia

Połączone wyzwania wymagają 3 wykonań czynności Mycie w konkretnej
przestrzeni:

- Kuchnia,
- Łazienka,
- Ogród,
- Salon,
- Sypialnia.

## Katalog zadań

Katalog zawiera startowy zestaw drobnych obowiązków oraz zadania dodane przez
użytkowników.

Można:

- dodać własną przestrzeń lub rodzaj czynności,
- dodać własne zadanie,
- wybrać ikonę,
- przypisać przestrzenie i czynności,
- edytować nazwę, ikonę, przestrzenie i czynności,
- zarchiwizować zadanie,
- przejrzeć ukryte zadania i przywrócić je do katalogu.

Archiwizacja nie usuwa wcześniejszych wykonań. Przywrócenie zadania nie
reaktywuje automatycznie wyłączonych reguł powtarzania.

## Nawigacja

Dolna nawigacja zawiera:

- Dzisiaj,
- Plan,
- Historia,
- Ranking,
- Więcej.

W sekcji „Więcej” znajdują się między innymi katalog, osiągnięcia i profil
użytkownika.

## PWA

HomeApp posiada:

- manifest aplikacji,
- tryb `standalone`,
- ikonę SVG i favicon,
- kolory motywu,
- możliwość instalacji na ekranie telefonu.

## Stack technologiczny

- Next.js 16
- React 19
- TypeScript
- Zod
- `pg` / node-postgres
- PostgreSQL z istniejącej instalacji Supabase
- zwykły SQL bez ORM-u
- Docker
- Traefik
- centralne Google SSO
- Web Push z kluczami VAPID

Nie uruchamiamy osobnego kontenera PostgreSQL dla HomeApp. Aplikacja korzysta
z istniejącej bazy Supabase, ale posiada osobny schemat `home_tasks` i osobne
konto bazy z ograniczonymi uprawnieniami.

## Infrastruktura produkcyjna

### Serwer `dell`

- kontener aplikacji `homeapp`,
- port hosta `3002`,
- istniejący kontener PostgreSQL `supabase-db`,
- sieć Docker `supabase_default`,
- katalog projektu `/home/wojciech/projects/homeapp`.

### Serwer `lenovo`

- centralny Traefik,
- Google SSO,
- publiczna domena,
- HTTPS,
- panel `https://panel.miasoftware.pl`,
- kafelek HomeApp prowadzący do aplikacji,
- kopie zapasowe schematu HomeApp.

## Baza danych

Dane aplikacji znajdują się w schemacie:

```text
home_tasks
```

Najważniejsze tabele:

- `profiles`
- `households`
- `household_members`
- `categories` — historyczna tabela zgodności, niewidoczna w interfejsie
- `task_templates`
- `task_attributes`
- `task_template_attributes`
- `planned_tasks`
- `recurring_task_rules`
- `task_completions`
- `notifications`
- `push_subscriptions`
- `profile_task_shortcuts`
- `achievement_definitions`
- `profile_achievements`
- `household_achievements`
- `waste_bag_outings` — wystawione worki, oddzielnie dla każdego miesiąca
- `waste_collection_days` — terminy oraz rodzaj odbioru śmieci

## Migracje

Migracje znajdują się w katalogu `database/migrations`.

| Plik | Zakres |
|---|---|
| `001_initial_schema.sql` | podstawowy schemat aplikacji |
| `002_seed_household_catalog.sql` | startowe kategorie i zadania |
| `003_recurring_and_achievements.sql` | powtarzanie i pierwsze odznaki |
| `004_task_shortcuts.sql` | osobiste szybkie zadania |
| `005_monthly_achievements.sql` | miesięczne okresy osiągnięć |
| `006_time_and_space_challenges.sql` | pory dnia i przestrzenie |
| `007_task_dimensions.sql` | niezależne przestrzenie, czynności i połączenia |
| `008_achievement_images.sql` | grafiki i szczegółowe osiągnięcia prania oraz ogrodu |
| `009_notifications.sql` | centrum powiadomień i subskrypcje Web Push |
| `010_remove_categories_from_ui.sql` | wycofanie kategorii z interfejsu i danych zadań |
| `011_home_map_spaces.sql` | dokładne przestrzenie używane przez mapę domu |
| `012_achievement_progress_and_reminders.sql` | postęp odznak, nowe połączenia i bezpieczne przypomnienia |
| `013_indoor_plants.sql` | kwiaty domowe i cykl podlewania liczony od wykonania |
| `014_waste_collection.sql` | liczenie wystawionych worków i kalendarz odbiorów |

Migracje są uruchamiane kolejno za pomocą `psql` jako administrator bazy.

Przykład:

```sh
docker exec -i supabase-db \
  psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres \
  < database/migrations/007_task_dimensions.sql
```

## Uruchomienie lokalne

Wymagane są Node.js, pnpm i dostęp do PostgreSQL ze schematem aplikacji.

```sh
pnpm install
pnpm dev
```

Zmienne środowiskowe:

```env
DATABASE_URL=postgresql://home_tasks_user:password@database-host:5432/postgres
ALLOWED_EMAILS=w.jaskula8@gmail.com,iza.hille@gmail.com
```

Nie należy umieszczać prawdziwego hasła bazy w repozytorium.

## Budowanie i wdrożenie Docker

```sh
docker compose build homeapp
docker compose up -d homeapp
docker compose ps homeapp
```

Kontener ma healthcheck sprawdzający:

```text
/manifest.webmanifest
```

## Backup

Schemat `home_tasks` jest codziennie kopiowany z serwera `dell` na serwer
`lenovo`.

Katalog kopii:

```text
/home/wojciech/backups/homeapp
```

Każda kopia:

- używa formatu `pg_dump --format=custom`,
- posiada plik kontrolny SHA-256,
- jest przechowywana przez 30 dni.

Skrypt znajduje się w:

```text
deploy/backup-homeapp.sh
```

## Obecnie wdrożone

- centralne logowanie Google SSO,
- ograniczenie do dwóch kont,
- przełączanie aktywnego profilu Iza/Wojtek na wspólnym urządzeniu,
- zielony motyw Izy i niebieski motyw Wojtka,
- ręcznie rysowany wygląd domowego notesu,
- jedno gospodarstwo domowe,
- katalog małych zadań,
- własne przestrzenie, czynności i zadania,
- edycja oraz archiwizacja zadań,
- planowanie jednorazowe, codzienne, tygodniowe i co 4 dni od wykonania,
- wyszukiwanie zadań po nazwie, przestrzeni i czynności przy planowaniu i skrótach,
- przypisywanie zadania osobie albo wszystkim,
- osobiste szybkie zadania,
- historia, usuwanie i przywracanie omyłkowych wykonań przez oboje domowników,
- tygodniowe i miesięczne zestawienia,
- tabela wyników Iza/Wojtek,
- miesięczne osiągnięcia,
- wyzwania pór dnia,
- wyzwania przestrzeni,
- wyzwania czynności,
- połączone wyzwania czynność + przestrzeń,
- cztery stałe wspólne misje oraz aktywna misja sezonowa z wieloma warunkami,
- indywidualne oraz wspólne serie aktywności,
- animowana celebracja po wykonaniu zadania,
- specjalny tryb lodówkowy pod adresem `/tablet`,
- pierwsza mapa domu z dzisiejszymi zadaniami pod adresem `/app/map`,
- dokładne przestrzenie parteru, piętra, garażu i ogrodu w katalogu,
- profil i edycja nazwy użytkownika,
- PWA, favicon i manifest,
- instalowalne PWA z ikonami Android 192/512 px, ikoną maskowalną i globalnym service workerem,
- wdrożenie Docker,
- Traefik, domena i HTTPS,
- kafelek w panelu serwera,
- codzienny backup,
- centrum powiadomień wewnątrz aplikacji,
- powiadomienia PWA Web Push i test urządzenia,
- dokładne paski postępu wszystkich odznak,
- powiadomienie i specjalna celebracja nowej odznaki,
- pięć dodatkowych połączonych osiągnięć i cztery misje sezonowe,
- przypomnienia o zadaniach na dziś i jutro,
- album osiągnięć z poprzednich miesięcy,
- statystyki 30-dniowe i wykres ostatnich 14 dni,
- podlewanie kwiatów osobno na parterze i piętrze co 4 dni,
- licznik czasu od podlania, termin kolejnego podlania i dedykowane przypomnienia,
- osiągnięcie „Zielona ręka”.

### Publiczne zasoby techniczne PWA

Traefik pozostawia aplikację i wszystkie dane za Google SSO. Bez logowania
udostępnia jedynie manifest, service workera, ikony aplikacji oraz neutralną
stronę offline. Jest to konieczne, ponieważ Chrome pobiera część zasobów
instalacyjnych niezależnie od zwykłej sesji strony; przekierowanie ich do Google
powoduje dodanie zwykłego skrótu zamiast instalacji PWA.

## Pomysły na kolejne etapy

### Uzgodnione do realizacji

- **Mapa domu z zadaniami** — pierwszy etap jest wdrożony: wizualizacja
  pomieszczeń i przypisanych do nich
  aktualnych zadań, np. salon z informacją o odkurzaniu. Mapa nie będzie na
  razie automatycznie oceniać ani obniżać poziomu czystości, ponieważ cztery
  koty i pies powodują bardzo nierówne tempo brudzenia pomieszczeń. Najpierw
  trzeba zapisać pełną listę pomieszczeń domu.

  Docelowy układ mapy:

  - **Parter:** kuchnia, przedsionek, przedpokój, gabinet, łazienka, spiżarnia
    i salon.
  - **Piętro:** schody, korytarz, garderoba, łazienka, sypialnia i Bawarski
    gabinet.
  - **Garaż:** garaż i schowek.
  - **Ogród:** front, tył, dalszy tył, taras, część owocowa, część warzywna
    i część Andrzeja.

- **Większe wspólne misje** — cztery stałe misje i automatycznie dobierana
  misja sezonowa są wdrożone; kolejny etap może dodać własne misje gospodarstwa.
- **Serie i małe celebracje** — serie indywidualne i domowe oraz celebracja
  punktu są wdrożone. Kolejny etap może celebrować osobno ukończenie dnia i
  całej misji. Serie nie odejmują punktów.
- **Specjalny tryb tabletu** — pierwszy etap jest dostępny pod `/tablet` dla
  8-calowego tabletu na lodówce. Ma duże zadania, skróty, misje, zegar,
  przełączanie profilu oraz obsługę Screen Wake Lock. Widoki telefonu i
  komputera pozostały bez zmian.

### Odłożone do drugiego etapu mapy

- **Stan czystości pomieszczeń** — wymaga ustalenia sposobu ręcznej lub
  półautomatycznej oceny oraz nierównego tempa brudzenia przy czterech kotach i
  psie. Nie wprowadzamy obecnie stałego automatycznego spadku czystości.
- **„Co teraz zrobić?”** — zostanie zaprojektowane razem ze stanem czystości i
  rozwiniętą mapą. Propozycja powinna wynikać z realnej sytuacji pomieszczenia,
  planu i przypisania użytkownika, a nie być zwykłym losowaniem z katalogu.
  Dopiero wtedy ustalimy źródła zadań, priorytety, pomijanie propozycji i
  ewentualne filtry.

- **Czujniki wilgotności roślin** — w przyszłości dane z ESP32 zastąpią lub
  skorygują sztywny czterodniowy termin. Obecny model przechowuje ostatnie
  wykonanie i wyliczony termin tak, aby integracja nie wymagała przebudowy UI.

### Świadomie poza planem

- automatyczna rotacja obowiązków — domownicy mają trwały, wygodny podział
  wynikający z tego, co każde z nich lubi robić,
- domowe nagrody i sklep za punkty — pozostają punkty, osiągnięcia i rozwijane
  wyzwania,
- własna lista zakupów — gospodarstwo korzysta z Listonic; nie dublujemy tej
  funkcji, chyba że w przyszłości pojawi się sensowna integracja.

### Pozostałe pomysły

- podmiana tymczasowych ikon według `GRAFIKI_DO_PRZYGOTOWANIA.md`,
- zdjęcia wykonanych prac,
- bardziej rozbudowane wyzwania współpracy,
- tryb offline i późniejsza synchronizacja.
