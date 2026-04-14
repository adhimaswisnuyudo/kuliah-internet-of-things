const express = require('express');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());

// Simpan data sementara
let dataSensor = {
  suhu: 0,
  waktu: ""
};

// Endpoint menerima data dari ESP32
app.post('/api/suhu', (req, res) => {
  const { suhu } = req.body;

  dataSensor.suhu = suhu;
  dataSensor.waktu = new Date().toLocaleTimeString();

  console.log("Data masuk:", dataSensor);

  res.json({ status: "ok" });
});

// Endpoint untuk frontend ambil data
app.get('/api/suhu', (req, res) => {
  res.json(dataSensor);
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

          #suhuChart {
            width: 100%;
            max-width: 100%;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 12px;
            border: 1px solid var(--border);
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
            <p class="subtitle">Pemantauan suhu real-time dari sensor DHT22</p>
          </header>

          <section class="grid">
            <article class="card">
              <p class="label">Suhu Saat Ini</p>
              <h2 id="suhu" class="temp">-- °C</h2>
              <p id="waktu" class="time">Update: -</p>
            </article>

            <article class="card">
              <p class="section-title">Status</p>
              <p class="time">Sumber data: ESP32 via HTTP API</p>
              <p class="time">Penyimpanan lokal: Browser localStorage</p>
              <p class="time">Interval refresh: 2 detik</p>
            </article>

            <article class="card span-2">
              <h3 class="section-title">Grafik Suhu (Line Chart)</h3>
              <div class="chart-wrap">
                <canvas id="suhuChart" height="300"></canvas>
              </div>
              <p id="chartInfo"></p>
            </article>

            <article class="card span-2">
              <h3 class="section-title">Riwayat Suhu (localStorage)</h3>
              <ul id="riwayat"></ul>
            </article>
          </section>
        </main>

        <script>
          const STORAGE_KEY_LAST = 'iot_suhu_terakhir';
          const STORAGE_KEY_HISTORY = 'iot_suhu_riwayat';
          const MAX_HISTORY = 10;
          let chart;

          function renderData(data) {
            document.getElementById('suhu').innerText = data.suhu + " °C";
            document.getElementById('waktu').innerText = "Update: " + data.waktu;
          }

          function renderRiwayat(riwayat) {
            const ul = document.getElementById('riwayat');
            ul.innerHTML = '';

            riwayat.forEach((item) => {
              const li = document.createElement('li');
              li.innerHTML = '<span>' + item.waktu + '</span><span class="badge">' + item.suhu + ' °C</span>';
              ul.appendChild(li);
            });
          }

          function renderChart(riwayat) {
            if (typeof Chart === 'undefined') {
              document.getElementById('chartInfo').innerText = 'Chart.js gagal dimuat. Cek koneksi internet/browser.';
              return;
            }

            const labels = [...riwayat].reverse().map((item) => item.waktu || '-');
            const dataSuhu = [...riwayat].reverse().map((item) => Number(item.suhu) || 0);

            if (!chart) {
              const ctx = document.getElementById('suhuChart').getContext('2d');
              chart = new Chart(ctx, {
                type: 'line',
                data: {
                  labels,
                  datasets: [{
                    label: 'Suhu (°C)',
                    data: dataSuhu,
                    borderColor: '#3bc7c4',
                    backgroundColor: 'rgba(59, 199, 196, 0.18)',
                    tension: 0.25,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5
                  }]
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
              return;
            }

            chart.data.labels = labels;
            chart.data.datasets[0].data = dataSuhu;
            chart.update();
          }

          function simpanKeLocalStorage(data) {
            localStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(data));

            const riwayatLama = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
            const riwayatBaru = [data, ...riwayatLama].slice(0, MAX_HISTORY);
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(riwayatBaru));

            renderRiwayat(riwayatBaru);
            renderChart(riwayatBaru);
          }

          function loadDariLocalStorage() {
            const dataTerakhir = JSON.parse(localStorage.getItem(STORAGE_KEY_LAST) || 'null');
            const riwayat = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');

            if (dataTerakhir) {
              renderData(dataTerakhir);
            }

            renderRiwayat(riwayat);
            renderChart(riwayat);
          }

          async function ambilDataSuhu() {
            const res = await fetch('/api/suhu');
            const data = await res.json();

            renderData(data);
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

app.listen(port, () => {
  console.log("Server jalan di http://localhost:" + port);
});