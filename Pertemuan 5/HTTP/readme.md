# 🌐 IoT HTTP Project – Monitoring Suhu DHT22

Project ini merupakan implementasi komunikasi **Internet of Things (IoT)** menggunakan protokol **HTTP**.

ESP32 membaca data suhu dari sensor **DHT22**, kemudian mengirimkan data tersebut ke **Web Server (Node.js)** dan ditampilkan secara real-time di browser.

---

## 🎯 Tujuan

- Menghubungkan ESP32 ke WiFi
- Mengirim data sensor menggunakan HTTP POST
- Membangun Web Server sederhana
- Menampilkan data sensor secara real-time

---

## 🧠 Arsitektur Sistem

DHT22 → ESP32 → WiFi → Node.js Server → Browser

---

## 🔌 Hardware

- ESP32 / Wemos D1 R32
- Sensor DHT22
- Kabel jumper

---

## ⚙️ Software

- Arduino IDE
- Node.js
- Library:
  - WiFi.h
  - HTTPClient.h
  - DHT (Adafruit)

---

## 🚀 Setup & Menjalankan Project

### 1. Setup Web Server (Node.js)

Buat folder project, lalu jalankan:

```bash
npm init -y
npm install express