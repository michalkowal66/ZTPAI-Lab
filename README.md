# Room Booking API

![CI](https://github.com/michalkowal66/ZTPAI-Lab/actions/workflows/ci.yml/badge.svg)

System zarządzania rezerwacjami sal konferencyjnych z autoryzacją JWT, bazą PostgreSQL oraz Swagger UI.

---

## Wymagania wstępne

- [Docker](https://www.docker.com/)
- (Opcjonalnie dla uruchomienia lokalnego): [Node.js](https://nodejs.org/) v22+

---

## Uruchomienie projektu od zera

Wykonaj poniższe kroki w terminalu:

### 1. Klonowanie repozytorium

```bash
git clone <URL_REPOZYTORIUM>
cd ZTPAI-Lab
```

### 2. Konfiguracja zmiennych środowiskowych

Skopiuj przykładowy plik konfiguracyjny `.env.example` do `.env`:

```bash
cp .env.example .env
```

_(W pliku `.env` znajdują się domyślne parametry połączenia do bazy danych oraz klucz JWT)._

### 3. Zbudowanie i uruchomienie kontenerów

Uruchom kontenery bazy danych (`db`) i aplikacji (`api`) za pomocą Docker Compose:

```bash
docker compose up --build
```

Aplikacja automatycznie poczeka na gotowość bazy PostgreSQL (healthcheck), wykona migracje schematu bazy danych i uruchomi serwer na porcie `3000`.

### 4. Dostęp do API i dokumentacji Swagger UI

Po uruchomieniu aplikacja jest dostępna pod adresami:

- **API**: `http://localhost:3000`
- **Swagger UI**: `http://localhost:3000/api/docs`

---

## Zasilenie bazy danymi początkowymi

Aby załadować początkowe dane (budynki, sale, rezerwacje oraz konta użytkowników, w tym konto administratora), wykonaj w osobnym oknie terminala:

```bash
docker compose exec api npx knex seed:run
```

---

## Zatrzymanie kontenerów (Graceful Shutdown)

Aby zatrzymać kontenery:

```bash
docker compose down
```

Aplikacja obsługuje sygnał `SIGTERM`, zamyka trwające połączenia HTTP oraz pulę połączeń do bazy danych bez oczekiwania na `SIGKILL`.

Jeżeli chcesz usunąć również wolumen z danymi bazy PostgreSQL:

```bash
docker compose down -v
```

---

## Testy

Uruchomienie wszystkich testów (jednostkowych i integracyjnych):

```bash
npm test
```

Uruchomienie tylko testów jednostkowych:

```bash
npm run test:unit
```

Uruchomienie tylko testów integracyjnych:

```bash
npm run test:integration
```
