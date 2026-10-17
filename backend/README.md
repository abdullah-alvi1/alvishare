# Alvishare

Same-WiFi file sharing. Upload files, get a short **receive key + QR code**, and download from any device.
Includes a **WebSocket** signaling server and **WebRTC** support for direct device-to-device transfers.

Stack: Node.js 18+, Express, SQLite (better-sqlite3), Multer, ws, qrcode, archiver.

## Quick start

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm start                 # or: npm run dev
```

The console prints a **Network** URL such as `http://192.168.1.20:3000`. Open it on any device on the same WiFi.
If your firewall asks, allow Node.js on private networks.

Verify everything works: `npm run smoke` (with the server running).

Docker: `docker compose up --build`.

## How it works

1. **Send** - `POST /api/v1/shares` with files -> returns `key`, `deleteToken`, QR/download URLs.
2. **Receive** - enter the key (or scan the QR) -> `GET /api/v1/shares/:key` shows the files -> `/download` streams them (zip if several).
3. Shares expire by time and optionally by download count. A cleanup job removes expired files every minute.

## REST API (base `/api/v1`)

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Status, active shares, WebSocket stats |
| GET | `/config` | Limits and LAN addresses |
| GET | `/webrtc/ice-config` | STUN/TURN servers for WebRTC |
| POST | `/shares` | Upload. multipart field `files` (repeatable). Optional: `expiryMinutes`, `maxDownloads` (0 = unlimited), `password` |
| GET | `/shares/:key` | File list + metadata (key is case-insensitive) |
| GET | `/shares/:key/download` | Download all (zip if >1 file). `?file=<id>` for one file. Password: header `X-Share-Password` or `?password=` |
| GET | `/shares/:key/qr` | QR for the receive page. `?target=receive|download` `&format=png|svg|dataurl` `&size=128-1024` `&dark=hex` `&light=hex` |
| DELETE | `/shares/:key` | Delete early. Header `X-Delete-Token` |
| GET | `/qr/connect` | QR that opens Alvishare on a phone (uses your LAN IP) |
| GET | `/qr?text=...` | Generic QR generator |

Errors are JSON: `{ "error": "message", "code": "MACHINE_CODE" }`. Key codes: `KEY_NOT_FOUND` 404, `LIMIT_REACHED` 410, `PASSWORD_REQUIRED` 401, `INVALID_PASSWORD` 403, `FILE_TOO_LARGE` 413, `RATE_LIMITED` 429.

### curl examples
```bash
curl -F "files=@photo.jpg" -F "expiryMinutes=10" http://localhost:3000/api/v1/shares
curl http://localhost:3000/api/v1/shares/ABC123
curl -OJ http://localhost:3000/api/v1/shares/ABC123/download
curl "http://localhost:3000/api/v1/shares/ABC123/qr?size=400" -o qr.png
curl -X DELETE -H "X-Delete-Token: <token>" http://localhost:3000/api/v1/shares/ABC123
```

## QR features
- **Share QR** - scanning opens `/r/<KEY>`, the receive page with the key prefilled.
- **Direct download QR** - `?target=download` encodes the download URL itself.
- **Connect QR** - `/qr/connect` lets a phone open the site without typing the IP.
- Formats: PNG, SVG, JSON data URL; custom size and colors.
- When you browse via `localhost`, QR codes automatically use your LAN IP so phones can reach them. Set `PUBLIC_URL` to override.

## WebSocket + WebRTC

Connect to `ws://<host>:3000/ws`. Messages are JSON.

**Discovery:** devices on the same WiFi (same LAN subnet / public IP) automatically see each other.

| Client sends | Purpose |
|---|---|
| `{"type":"hello","name":"My Phone","deviceType":"mobile"}` | Set display name |
| `{"type":"signal","to":"<peerId>","data":{...}}` | Relay SDP offer/answer/ICE candidate |
| `{"type":"share:notify","to":"<peerId>","key":"ABC123"}` | Push a receive key to a nearby device |
| `{"type":"room:create"}` / `{"type":"room:join","code":"K7F2QX"}` / `{"type":"room:leave"}` | Code-based rooms for devices on different networks |
| `{"type":"ping"}` | Keepalive |

| Server sends | Purpose |
|---|---|
| `welcome` | Your `id`, `name`, nearby `peers`, `iceServers` |
| `peer:joined` / `peer:updated` / `peer:left` | Nearby device changes |
| `signal` | `{from, data}` relayed from a peer |
| `room:created` / `room:joined` / `room:peer-joined` / `room:peer-left` / `room:left` | Room events |
| `share:received` | `{from, key}` |
| `error` | `{code, message}` |

**P2P transfer flow:** A creates an `RTCPeerConnection` with the `iceServers` from `welcome`, opens a data channel, sends an offer through `signal`; B answers; both exchange ICE candidates the same way; then the file flows in 16 KB chunks directly between browsers. The server never sees the file. See `public/app.js` for a complete working implementation.

## Postman
1. Import `postman/Alvishare.postman_collection.json` (and optionally the environment file).
2. Run **Send > Upload single file** - pick a file in the `files` row. `key`, `deleteToken` and `fileId` are saved automatically.
3. Run Receive, QR and Manage requests in any order. Use **Send** in Postman to save a download or view a QR image.
4. WebSocket: **New > WebSocket**, URL `ws://localhost:3000/ws`, Connect, then send the JSON messages above. Open two tabs to see peers appear.

## Configuration
All options live in `.env` (see `.env.example`): max file size, files per share, storage cap, blocked extensions, key length, expiry, rate limits, STUN/TURN.

## Security notes
- Keys use a crypto-secure RNG from an unambiguous alphabet; lookups are rate limited (30/min/IP by default).
- Files are stored under random UUIDs outside any static folder, served only with `Content-Disposition: attachment` + `nosniff`.
- Passwords are hashed with scrypt; delete tokens use constant-time comparison.
- Helmet, CORS, request size limits, per-IP WebSocket caps and message rate limiting are enabled.
- A one-time download is consumed when the download starts; an interrupted download cannot be resumed.
- Serving over the internet? Put it behind HTTPS (nginx/Caddy), set `TRUST_PROXY=1`, and set `client_max_body_size` above your max file size. Add a TURN server for WebRTC across networks.
