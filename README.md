CelebrateHub
=============

A minimal starter project to track events and per-user (family) activities: guest counts, accommodation, food habits, transportation.

Structure
- backend: Spring Boot (Maven)
- frontend: React sample (instructions to create with Create React App)

Run backend

1. Install Java 11+ and Maven.
2. From `backend` run:

```bash
mvn spring-boot:run
```

Backend will run on port 8080. API endpoints:
- `GET /api/events` — list events
- `POST /api/events` — create an event (JSON: name, date, activities)

Frontend (quick start)

1. Create a React app (we provided a small sample in `frontend/sample`):

```bash
npx create-react-app celebrate-hub-frontend
cd celebrate-hub-frontend
```

2. Replace `src/App.js` and `src/index.js` with the sample files from `frontend/sample`.
3. To proxy API calls to backend, add in `package.json`:

```json
  "proxy": "http://localhost:8080",
```

4. Run frontend:

```bash
npm start
```

Name suggestions
- CelebrateHub (default used here)
- EventNest
- Gatherly
- FamFest
- PartyPlanner

Next steps
- Expand frontend forms to manage per-family guest counts, accommodations, food preferences, and transport assignments.
- Add persistence (database) and authentication for multi-user support.
