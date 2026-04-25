# Digitech UTS — Dashboard (React + SQLite + MQTT + Telegram)

## Fitur

- **MQTT** (server Node): subscribe `digitech/uts-iot/#`, topik mahasiswa `digitech/uts-iot/{nama}`.
- **SQLite** (`data/uts_history.db`): menyimpan riwayat; baris pertama per `topic` = bukti pengumpulan.
- **Telegram**: saat **pertama kali** menerima data untuk suatu `topic`, server mengirim pesan ke chat (butuh token di `.env`).
- **React**: polling `GET /api/history` tiap 3 detik.

## Setup

```bash
cd UTS/Dashboard
cp .env.example .env
# isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di .env
npm install
npm run dev
```

Buka `http://localhost:5173/` (atau `PORT` di `.env`).

## Produksi

```bash
npm run build
NODE_ENV=production npm start
```

## Catatan

- `better-sqlite3` butuh toolchain native (Xcode CLI di Mac, `build-essential` di Linux).
- Token Telegram **hanya** di `.env` server, jangan di-commit.
