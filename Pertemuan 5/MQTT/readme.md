# 📡 Pertemuan 5 – MQTT IoT (DHT22 Monitoring)

Pada praktikum ini, kita akan mengimplementasikan komunikasi **Internet of Things (IoT)** menggunakan protokol **MQTT (Message Queuing Telemetry Transport)**.

ESP32 membaca data suhu dari sensor **DHT22**, kemudian mengirimkan data ke **MQTT Broker (HiveMQ)** dan dapat dimonitor secara real-time melalui client (browser / aplikasi).

---

## 🎯 Tujuan

- Memahami konsep publish-subscribe pada MQTT
- Menghubungkan ESP32 ke MQTT Broker
- Mengirim data sensor secara real-time
- Monitoring data melalui MQTT client

---

## 🧠 Arsitektur Sistem

DHT22 → ESP32 → WiFi → MQTT Broker → Client (Web / Desktop)

---

## 🔌 Hardware

- ESP32 / Wemos D1 R32
- Sensor DHT22

---

## ⚙️ Software

- Arduino IDE
- MQTT Broker: HiveMQ (public broker)
- MQTT Client:
  - HiveMQ Web Client (browser)
  - MQTT Explorer (desktop)

Library:
- WiFi.h
- PubSubClient.h
- DHT (Adafruit)

---

## 🚀 Langkah Praktikum

### 1. Setup MQTT Broker

Gunakan broker publik:

broker.hivemq.com

broker.hivemq.com


---

### 2. Setup MQTT Client (Monitoring)

#### Opsi 1 – Browser (HiveMQ Web Client)

Buka:

https://www.hivemq.com/demos/websocket-client/

Konfigurasi:

- Host: `broker.hivemq.com`
- Port: `8884`
- SSL: ON
- Path: `/mqtt`

Klik **Connect**

---

#### Opsi 2 – MQTT Explorer (Recommended)

Install aplikasi:

MQTT Explorer

Konfigurasi:

- Host: `broker.hivemq.com`
- Port: `1883`

Klik **Connect**

---

### 3. Subscribe Topic

Gunakan topic:

iot/digitech-adhimas/suhu

