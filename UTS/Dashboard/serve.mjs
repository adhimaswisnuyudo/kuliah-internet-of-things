/**
 * Single process: API + SQLite + MQTT + Telegram + (dev) Vite / (prod) static
 */
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import mqtt from 'mqtt';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'node:http';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

const DB_PATH = path.resolve(__dirname, process.env.DB_PATH || './data/uts_history.db');
const MQTT_URL = process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883';
const MQTT_SUBSCRIBE = normalizeSubscribe(
  process.env.MQTT_SUBSCRIBE || 'digitech/uts-iot/#',
);
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.LISTEN_HOST || '0.0.0.0';

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    topic TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    nama TEXT,
    suhu REAL,
    payload TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    telegram_sent INTEGER NOT NULL DEFAULT 0
  );
`);

const selectAll = db.prepare(
  `SELECT topic, slug, nama, suhu, payload, first_seen_at, last_seen_at, telegram_sent
   FROM history ORDER BY first_seen_at DESC`,
);

const markTelegramSent = db.prepare(
  'UPDATE history SET telegram_sent = 1 WHERE topic = ?',
);

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set');
    return false;
  }
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    console.error('[telegram] send failed:', body);
    return false;
  }
  return true;
}

function slugFromTopic(topic) {
  const p = String(topic).split('/').filter(Boolean);
  return p.length ? p[p.length - 1] : '';
}

function normalizeSubscribe(value) {
  const raw = String(value || '').trim();
  if (raw.endsWith('/')) {
    // .env may treat '#' as a comment, truncating the subscription (e.g. .../uts-iot/ instead of .../uts-iot/#)
    return `${raw}#`;
  }
  return raw;
}

function handleMqttPayload(topicStr, raw) {
  const slug = slugFromTopic(topicStr);
  let nama = slug;
  let suhu = null;
  try {
    const o = JSON.parse(raw);
    if (o.nama != null && String(o.nama).trim()) nama = String(o.nama).trim();
    if (o.suhu != null && o.suhu !== '') {
      const n = Number(o.suhu);
      if (!Number.isNaN(n)) suhu = n;
    }
  } catch {
    /* not JSON */
  }

  const now = new Date().toISOString();
  const existing = db
    .prepare('SELECT topic, telegram_sent FROM history WHERE topic = ?')
    .get(topicStr);

  const waktu = new Date().toLocaleString('en-GB', { hour12: false });
  const msg = [
    'UTS IoT — first payload received',
    `Time: ${waktu}`,
    `Topic: ${topicStr}`,
    `Slug: ${slug}`,
    `Name (payload): ${nama}`,
    suhu != null ? `Temp: ${suhu} °C` : null,
    '',
    'The first message for this topic was stored successfully.',
  ]
    .filter((x) => x != null)
    .join('\n');

  if (!existing) {
    db.prepare(
      `INSERT INTO history (topic, slug, nama, suhu, payload, first_seen_at, last_seen_at, telegram_sent)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    ).run(topicStr, slug, nama, suhu, raw, now, now);

    void sendTelegram(msg).then((ok) => {
      if (ok) {
        try {
          markTelegramSent.run(topicStr);
        } catch (e) {
          console.error('[db] mark telegram', e);
        }
      }
    });

    console.log('[uts] NEW:', slug, nama);
  } else {
    db.prepare(
      `UPDATE history SET last_seen_at = ?, suhu = COALESCE(?, suhu), nama = COALESCE(?, nama), payload = ?
       WHERE topic = ?`,
    ).run(now, suhu, nama, raw, topicStr);

    // Retry if Telegram had failed before.
    if (!existing.telegram_sent) {
      void sendTelegram(msg).then((ok) => {
        if (ok) {
          try {
            markTelegramSent.run(topicStr);
          } catch (e) {
            console.error('[db] mark telegram', e);
          }
        }
      });
    }
  }
}

function startMqtt() {
  const client = mqtt.connect(MQTT_URL, {
    clientId: `uts-server-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    reconnectPeriod: 4000,
    protocolVersion: 4,
  });

  client.on('connect', () => {
    console.log('[mqtt] connected', MQTT_URL);
    client.subscribe(MQTT_SUBSCRIBE, { qos: 0 }, (err) => {
      if (err) console.error('[mqtt] subscribe error', err);
      else console.log('[mqtt] subscribe', MQTT_SUBSCRIBE);
    });
  });

  client.on('message', (topic, buf) => {
    try {
      handleMqttPayload(String(topic), buf.toString('utf8'));
    } catch (e) {
      console.error('[mqtt] handle', e);
    }
  });

  client.on('error', (e) => console.error('[mqtt]', e.message));
  return client;
}

const mqttClient = startMqtt();

const app = express();
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mqtt: MQTT_URL,
    db: DB_PATH,
    mqtt_connected: Boolean(mqttClient?.connected),
    telegram_connected: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  });
});

app.get('/api/history', (_req, res) => {
  try {
    const rows = selectAll.all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

if (isProd) {
  const dist = path.join(__dirname, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('Run npm run build first.');
    process.exit(1);
  }
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(dist, 'index.html'), (err) => err && next(err));
  });
} else {
  const vite = await createViteServer({
    root: __dirname,
    server: { middlewareMode: true },
  });
  app.use(vite.middlewares);
}

const httpServer = createHttpServer(app);
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is in use. Set PORT=5174 or stop the other process.`);
  } else console.error(err);
  process.exit(1);
});

httpServer.listen(PORT, HOST, () => {
  const mode = isProd ? 'production' : 'development';
  console.log(`Digitech UTS Dashboard [${mode}] http://localhost:${PORT}/`);
  console.log(`SQLite: ${DB_PATH}`);
});
