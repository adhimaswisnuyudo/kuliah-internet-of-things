#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

// ===== KONFIGURASI =====
#define DHTPIN 4
#define DHTTYPE DHT22

const char* ssid = "<SSID WIFI>";
const char* password = "<PASSWORD WIFI>";

// GANTI IP INI!
const char* serverUrl = "http://72.61.143.70:3000/api/suhu";
const char* pingUrl   = "http://72.61.143.70:3000";

// Isi dengan nama Anda (field JSON: nama_anda)
const char* nama_anda = "Nama Anda";

// ===== INISIALISASI =====
DHT dht(DHTPIN, DHTTYPE);

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== START PROGRAM IoT HTTP ===");

  dht.begin();

  connectWiFi();
  cekServer();
}

// ===== LOOP =====
void loop() {
  float suhu = dht.readTemperature();

  if (isnan(suhu)) {
    Serial.println("❌ Gagal membaca DHT22");
    delay(2000);
    return;
  }

  Serial.print("🌡️ Suhu: ");
  Serial.println(suhu);

  if (WiFi.status() == WL_CONNECTED) {
    kirimData(suhu);
  } else {
    Serial.println("⚠️ WiFi terputus, reconnect...");
    connectWiFi();
  }

  delay(5000);
}

// ===== FUNGSI WIFI =====
void connectWiFi() {
  Serial.println("🔌 Menghubungkan ke WiFi...");
  WiFi.begin(ssid, password);

  int retry = 0;

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    retry++;

    if (retry > 20) {
      Serial.println("\n❌ Gagal konek WiFi!");
      return;
    }
  }

  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

// ===== FUNGSI CEK SERVER =====
void cekServer() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    Serial.println("🔍 Cek koneksi server...");

    http.begin(pingUrl);
    int responseCode = http.GET();

    Serial.print("Ping Response: ");
    Serial.println(responseCode);

    if (responseCode > 0) {
      Serial.println("✅ Server TERHUBUNG");
    } else {
      Serial.println("❌ Server TIDAK TERHUBUNG");
    }

    http.end();
  }
}

// ===== FUNGSI KIRIM DATA =====
void kirimData(float suhu) {
  HTTPClient http;

  Serial.println("📡 Mengirim data ke server...");

  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String json = "{\"suhu\":" + String(suhu) + ",\"nama_anda\":\"" + String(nama_anda) + "\"}";

  int responseCode = http.POST(json);

  Serial.print("Response Code: ");
  Serial.println(responseCode);

  if (responseCode > 0) {
    String response = http.getString();
    Serial.println("Response Body:");
    Serial.println(response);
  } else {
    Serial.println("❌ Gagal kirim data!");
  }

  http.end();
}