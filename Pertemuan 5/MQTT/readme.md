# Pertemuan 5 - MQTT IoT (DHT22)

Implementasi ini setara versi HTTP, tetapi komunikasi data suhu memakai MQTT.
Tidak ada webserver di skenario ini.

Arsitektur:

DHT22 -> ESP32 -> WiFi -> MQTT Broker -> Subscriber/Client

## Broker pakai apa?

Untuk praktikum, paling cepat pakai broker publik:

- Broker: `broker.hivemq.com`
- Port: `1883` (tanpa TLS, paling simpel untuk uji awal)
- Topic contoh: `iot/digitech-adhimas/suhu`

Catatan:

- Broker publik cocok untuk demo/lab.
- Produksi disarankan pakai broker sendiri (Mosquitto/EMQX) + autentikasi + TLS.

## File yang disediakan

- Publisher ESP32: `Board/dht22_mqtt.ino`
- Subscriber Node.js (terminal): `Subscriber/subscriber.js`

## Langkah-langkah

### 1) Upload kode ESP32

1. Buka `Board/dht22_mqtt.ino` di Arduino IDE.
2. Install library:
   - `PubSubClient`
   - `DHT sensor library` (Adafruit)
3. Isi konfigurasi:
   - `ssid`
   - `password`
   - `nama_anda`
4. (Opsional) Ganti topic jika perlu:
   - `topic_suhu = "iot/digitech-adhimas/suhu"`
5. Upload ke board ESP32.

Setelah konek, ESP32 akan publish JSON tiap 5 detik dengan format:

```json
{"nama_anda":"Nama Anda","suhu":29.12,"timestamp":123456}
```

### 2) Jalankan subscriber (tanpa webserver)

Masuk ke folder:

```bash
cd "Pertemuan 5/MQTT/Subscriber"
```

Install dependency (sekali saja):

```bash
npm install
```

Jalankan subscriber:

```bash
npm start
```

### 3) (Opsional) Ganti broker/topic via environment variable

```bash
MQTT_URL="mqtt://broker.hivemq.com:1883" MQTT_TOPIC="iot/digitech-adhimas/suhu" npm start
```

## Verifikasi sukses

- Serial Monitor ESP32 menunjukkan `MQTT Connected` dan `Publish ... BERHASIL`.
- Terminal subscriber menampilkan data masuk, contoh:

`[10:22:11] iot/digitech-adhimas/suhu | Adhimas | 28.7 C`

## Troubleshooting cepat

- Tidak ada data masuk:
  - Pastikan topic publisher dan subscriber sama persis.
  - Pastikan WiFi ESP32 tersambung.
  - Coba topic unik (mis. tambah nama/kelas) agar tidak bercampur dengan user lain.
- Gagal konek broker:
  - Cek jaringan, kadang port 1883 diblokir jaringan kampus/kantor.
  - Coba jaringan lain/hotspot.

