# Grafiki do przygotowania

## Wspólna specyfikacja

- Format: PNG albo WebP, kwadrat `512 × 512 px`.
- Bez tekstu, cyfr, podpisów i znaków wodnych.
- Główny symbol duży i czytelny po zmniejszeniu do około `64 px`.
- Styl aplikacji: ręczny rysunek, nieregularny czarny kontur, ciepłe papierowe tło.
- Kolory akcentów: niebieski i zielony; bez realistycznego zdjęcia.
- Gotowe pliki osiągnięć wklejamy do `public/images/achievements/`, a misji do `public/images/missions/`.

## Najpilniejsze osiągnięcia

| Nazwa pliku | Odznaka | Co powinno być na grafice |
| --- | --- | --- |
| `vacuum-living-room.png` | Salon bez okruszka | odkurzacz, dywan i zarys kanapy |
| `vacuum-bedroom.png` | Spokojna sypialnia | odkurzacz przy pościelonym łóżku |
| `dusting-living-room.png` | Salon bez pyłku | miotełka do kurzu, półka i zarys kanapy |
| `tidying-whole-home.png` | Wszystko na swoim miejscu | dom, kosz i odkładane na miejsce przedmioty |
| `pet-care-whole-home.png` | Dom pełen łap | kot, pies, miska i ślady łap |
| `plant-watering.png` | Zielona ręka | konewka podlewająca zdrową domową roślinę w doniczce |

Pierwsze trzy pliki mają już wersje tymczasowe w `public/images/achievements/generated/`. Można je później po prostu podmienić plikiem o tej samej nazwie.

## Wspólne misje

| Nazwa pliku | Misja | Co powinno być na grafice |
| --- | --- | --- |
| `everyone-five.png` | Każdy dokłada rękę | dwie dłonie lub dwie postacie robiące wspólnie porządek |
| `weekend-reset.png` | Weekendowy reset | dom otoczony ruchem/strzałkami i błyskami czystości |
| `bathroom-operation.png` | Operacja Łazienka | prysznic, toaleta, szczotka i bańki |
| `animal-team.png` | Zwierzęca ekipa | cztery koty, pies, miska i łapki |

## Misje sezonowe

| Nazwa pliku | Misja | Co powinno być na grafice |
| --- | --- | --- |
| `season-spring.png` | Wiosenne przebudzenie | otwarte okno, kwiaty, miotła i świeże liście |
| `season-summer.png` | Letnia ofensywa | ogród, taras, konewka i słońce |
| `season-autumn.png` | Jesienny reset | grabie, liście, kosz i uporządkowany dom |
| `season-winter.png` | Zimowe gniazdo | przytulny dom, koc, śnieg i błysk czystości |

## Kolejny etap — ujednolicenie całej kolekcji

Po powyższych grafikach można przygotować odpowiedniki istniejących grup: główne osiągnięcia (pierwsze zadanie, 10 zadań, wszechstronność, seria, wspólny wynik), pory dnia (rano, południe, popołudnie, wieczór, noc), przestrzenie (kuchnia, łazienka, ogród, salon, sypialnia, cały dom), czynności (mycie, odkurzanie, kurz, porządkowanie, pranie i jego etapy, naczynia, odpady, zwierzęta, koszenie) oraz połączenia mycia z pomieszczeniami.

Nazw plików z tej drugiej partii nie trzeba zgadywać. Po dostarczeniu grafik dopiszemy ich mapowanie do kodów osiągnięć w jednej migracji, bez zmiany danych historycznych.
