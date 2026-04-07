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
      </head>
      <body>
        <h1>Monitoring Suhu</h1>
        <h2 id="suhu">-- °C</h2>
        <p id="waktu"></p>

        <script>
          setInterval(async () => {
            const res = await fetch('/api/suhu');
            const data = await res.json();

            document.getElementById('suhu').innerText = data.suhu + " °C";
            document.getElementById('waktu').innerText = "Update: " + data.waktu;
          }, 2000);
        </script>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log("Server jalan di http://localhost:" + port);
});