# Alvishare (backend + frontend)

```
alvishare/
  backend/    Node + Express + WebSocket + SQLite  (serves the built UI from backend/public)
  frontend/   React + Vite + Tailwind + lucide icons (source)
```

## Run (one command setup)
```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm start
```
Open the **Network** URL printed in the terminal (e.g. http://192.168.x.x:3000) on any device on the same WiFi.
The UI is already built into `backend/public`.

## Edit the frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxies /api and /ws to the backend on :3000)
npm run build      # rebuilds into ../backend/public
```
Keep the backend running while using `npm run dev`.

API, QR and WebSocket/WebRTC docs: `backend/README.md`. Postman files: `backend/postman`.
