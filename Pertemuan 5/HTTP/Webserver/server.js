const express = require('express');
const app = express();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json());

// Simpan data per nama pengirim (key = nama_anda)
let dataByNama = {};

function snapshotPengirim() {
  return Object.keys(dataByNama)
    .sort()
    .map((k) => {
      const p = dataByNama[k];
      return {
        nama_anda: p.nama_anda,
        suhu: p.suhu,
        waktu: p.waktu,
        riwayat: p.history
      };
    });
}

// Endpoint menerima data dari ESP32
app.post('/api/suhu', (req, res) => {
  const { suhu, nama_anda } = req.body;
  const nama =
    nama_anda != null && String(nama_anda).trim()
      ? String(nama_anda).trim()
      : "(tanpa nama)";
  const waktuStr = new Date().toLocaleTimeString();
  const nilaiSuhu = Number(suhu);

  if (!dataByNama[nama]) {
    dataByNama[nama] = {
      nama_anda: nama,
      suhu: 0,
      waktu: "",
      history: []
    };
  }
  const entry = dataByNama[nama];
  entry.suhu = nilaiSuhu;
  entry.waktu = waktuStr;
  entry.history.unshift({ suhu: nilaiSuhu, waktu: waktuStr });
  entry.history = entry.history.slice(0, 50);

  console.log("Data masuk:", nama, entry.suhu, entry.waktu);

  res.json({ status: "ok" });
});

// Endpoint untuk frontend ambil data (multi pengirim)
app.get('/api/suhu', (req, res) => {
  res.json({ pengirim: snapshotPengirim() });
});

// Halaman web sederhana
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>IoT Monitoring</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
        <style>
          :root {
            --bg: #0b1220;
            --panel: #111a2e;
            --panel-soft: #16223b;
            --text: #e5ecff;
            --muted: #9fb0d8;
            --accent: #3bc7c4;
            --accent-soft: rgba(59, 199, 196, 0.18);
            --danger: #ff7e8a;
            --border: rgba(255, 255, 255, 0.08);
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: 'Inter', Arial, sans-serif;
            color: var(--text);
            background: radial-gradient(circle at 20% 20%, #162746 0%, var(--bg) 45%);
            min-height: 100vh;
          }

          .container {
            max-width: 980px;
            margin: 0 auto;
            padding: 24px;
          }

          .header {
            margin-bottom: 20px;
          }

          .title {
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 0.2px;
          }

          .subtitle {
            margin: 8px 0 0;
            color: var(--muted);
            font-size: 14px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .card {
            background: linear-gradient(180deg, var(--panel-soft), var(--panel));
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 18px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
          }

          .label {
            margin: 0;
            color: var(--muted);
            font-weight: 600;
            font-size: 13px;
          }

          .temp {
            margin: 8px 0 6px;
            font-size: 44px;
            font-weight: 800;
            color: #d9fffe;
          }

          .time {
            margin: 0;
            color: #b9c9ef;
            font-size: 14px;
          }

          .section-title {
            margin: 0 0 12px;
            font-size: 16px;
            font-weight: 700;
          }

          .chart-wrap {
            width: 100%;
            overflow-x: auto;
          }

          .chart-canvas {
            width: 100%;
            max-width: 100%;
            min-height: 240px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 12px;
            border: 1px solid var(--border);
          }

          #grafik-per-nama {
            display: contents;
          }

          .ringkasan-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
            margin-top: 8px;
          }

          .pengirim-mini {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px;
          }

          .pengirim-mini .temp-small {
            margin: 4px 0;
            font-size: 26px;
            font-weight: 800;
            color: #d9fffe;
          }

          #chartInfo {
            margin: 10px 0 0;
            color: var(--danger);
            font-size: 13px;
            font-weight: 600;
          }

          #riwayat {
            margin: 0;
            padding: 0;
            list-style: none;
            display: grid;
            gap: 8px;
          }

          #riwayat li {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            padding: 10px 12px;
            border-radius: 10px;
            color: #dbe6ff;
            font-size: 14px;
          }

          .badge {
            padding: 4px 10px;
            border-radius: 999px;
            background: var(--accent-soft);
            border: 1px solid rgba(59, 199, 196, 0.4);
            color: #bffffd;
            font-weight: 700;
            font-size: 12px;
          }

          @media (min-width: 860px) {
            .grid {
              grid-template-columns: 1fr 1fr;
            }

            .card.span-2 {
              grid-column: span 2;
            }
          }
        </style>
      </head>
      <body>
        <main class="container">
          <header class="header">
            <h1 class="title">IoT Monitoring Dashboard</h1>
            <p class="subtitle">Pemantauan suhu per pengirim (nama dari ESP32) — grafik terpisah per nama</p>
          </header>

          <section class="grid">
            <article class="card span-2">
              <p class="label">Ringkasan per nama</p>
              <div id="ringkasan-pengirim" class="ringkasan-grid">
                <p class="time">Memuat…</p>
              </div>
            </article>

            <article class="card">
              <p class="section-title">Status</p>
              <p class="time">Sumber data: ESP32 via HTTP API</p>
              <p class="time">Riwayat server: sampai 50 titik per nama</p>
              <p class="time">Interval refresh: 2 detik</p>
            </article>

            <div id="grafik-per-nama"></div>

            <article class="card span-2">
              <h3 class="section-title">Riwayat gabungan (semua nama)</h3>
              <ul id="riwayat"></ul>
            </article>
          </section>
        </main>

        <script>
          const STORAGE_KEY_MULTI = 'iot_suhu_per_nama';
          const COLORS = [
            ['#3bc7c4', 'rgba(59, 199, 196, 0.18)'],
            ['#c77bff', 'rgba(199, 123, 255, 0.18)'],
            ['#ffb347', 'rgba(255, 179, 71, 0.18)'],
            ['#7bff9e', 'rgba(123, 255, 158, 0.18)'],
            ['#ff7e8a', 'rgba(255, 126, 138, 0.18)']
          ];
          let chartInstances = [];

          function escapeHtml(s) {
            const div = document.createElement('div');
            div.textContent = s == null ? '' : String(s);
            return div.innerHTML;
          }

          function renderRingkasan(pengirim) {
            const el = document.getElementById('ringkasan-pengirim');
            if (!pengirim || pengirim.length === 0) {
              el.innerHTML = '<p class="time">Belum ada data. Kirim dari ESP32 dengan field nama_anda.</p>';
              return;
            }
            el.innerHTML = pengirim.map(function (p) {
              return (
                '<div class="pengirim-mini">' +
                '<p class="label">' + escapeHtml(p.nama_anda) + '</p>' +
                '<p class="temp-small">' + escapeHtml(String(p.suhu)) + ' °C</p>' +
                '<p class="time">Update: ' + escapeHtml(p.waktu || '-') + '</p>' +
                '</div>'
              );
            }).join('');
          }

          function renderRiwayatGabungan(pengirim) {
            const ul = document.getElementById('riwayat');
            ul.innerHTML = '';
            if (!pengirim || pengirim.length === 0) {
              const li = document.createElement('li');
              li.className = 'time';
              li.textContent = 'Belum ada riwayat.';
              ul.appendChild(li);
              return;
            }
            pengirim.forEach(function (p) {
              (p.riwayat || []).forEach(function (item) {
                const li = document.createElement('li');
                li.innerHTML =
                  '<span>' +
                  escapeHtml(p.nama_anda) +
                  ' · ' +
                  escapeHtml(item.waktu || '-') +
                  '</span><span class="badge">' +
                  escapeHtml(String(item.suhu)) +
                  ' °C</span>';
                ul.appendChild(li);
              });
            });
          }

          function destroyCharts() {
            chartInstances.forEach(function (ch) {
              ch.destroy();
            });
            chartInstances = [];
          }

          function renderChartsPerNama(pengirim) {
            const root = document.getElementById('grafik-per-nama');
            destroyCharts();
            root.innerHTML = '';

            if (typeof Chart === 'undefined') {
              root.innerHTML =
                '<article class="card span-2"><p id="chartInfo">Chart.js gagal dimuat. Cek koneksi internet/browser.</p></article>';
              return;
            }

            if (!pengirim || pengirim.length === 0) {
              root.innerHTML =
                '<article class="card span-2"><p class="time">Belum ada grafik — tunggu data dari perangkat.</p></article>';
              return;
            }

            pengirim.forEach(function (p, idx) {
              const article = document.createElement('article');
              article.className = 'card span-2';
              const title = document.createElement('h3');
              title.className = 'section-title';
              title.textContent = 'Grafik suhu — ' + p.nama_anda;
              const wrap = document.createElement('div');
              wrap.className = 'chart-wrap';
              wrap.style.height = '280px';
              const canvas = document.createElement('canvas');
              canvas.className = 'chart-canvas';
              wrap.appendChild(canvas);
              article.appendChild(title);
              article.appendChild(wrap);
              root.appendChild(article);

              const riwayat = [].concat(p.riwayat || []).reverse();
              const labels = riwayat.map(function (r) {
                return r.waktu || '-';
              });
              const dataSuhu = riwayat.map(function (r) {
                return Number(r.suhu) || 0;
              });
              const color = COLORS[idx % COLORS.length];
              const ctx = canvas.getContext('2d');
              const ch = new Chart(ctx, {
                type: 'line',
                data: {
                  labels: labels,
                  datasets: [
                    {
                      label: 'Suhu (°C)',
                      data: dataSuhu,
                      borderColor: color[0],
                      backgroundColor: color[1],
                      tension: 0.25,
                      fill: true,
                      pointRadius: 3,
                      pointHoverRadius: 5
                    }
                  ]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: {
                        color: '#dce8ff'
                      }
                    }
                  },
                  scales: {
                    x: {
                      ticks: {
                        color: '#9fb0d8'
                      },
                      grid: {
                        color: 'rgba(255, 255, 255, 0.08)'
                      }
                    },
                    y: {
                      beginAtZero: false,
                      ticks: {
                        color: '#9fb0d8'
                      },
                      grid: {
                        color: 'rgba(255, 255, 255, 0.08)'
                      }
                    }
                  }
                }
              });
              chartInstances.push(ch);
            });
          }

          function simpanKeLocalStorage(data) {
            try {
              localStorage.setItem(STORAGE_KEY_MULTI, JSON.stringify(data));
            } catch (e) {}
            var list = data && data.pengirim ? data.pengirim : [];
            renderRingkasan(list);
            renderRiwayatGabungan(list);
            renderChartsPerNama(list);
          }

          function loadDariLocalStorage() {
            try {
              var raw = localStorage.getItem(STORAGE_KEY_MULTI);
              if (!raw) return;
              var data = JSON.parse(raw);
              if (data && data.pengirim) {
                simpanKeLocalStorage(data);
              }
            } catch (e) {}
          }

          async function ambilDataSuhu() {
            const res = await fetch('/api/suhu');
            const data = await res.json();
            simpanKeLocalStorage(data);
          }

          loadDariLocalStorage();
          ambilDataSuhu();
          setInterval(ambilDataSuhu, 2000);
        </script>
      </body>
    </html>
  `);
});

app.listen(port, host, () => {
  console.log("Server jalan di http://" + host + ":" + port);
});