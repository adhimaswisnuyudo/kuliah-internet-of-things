/*
  UTS IoT - ESP32 + DHT22 + MQTT (Publish Suhu)

  Mahasiswa WAJIB mengisi bagian "KONFIGURASI MAHASISWA" di bawah
  sebelum di-upload ke board.

  Library yang diperlukan (Arduino Library Manager):
  - PubSubClient (by Nick O'Leary)
  - DHT sensor library (by Adafruit)
  - (dependency DHT) Adafruit Unified Sensor

  Broker contoh (sesuai petunjuk dosen / praktikum):
  - broker.hivemq.com, port 1883 (tanpa TLS, untuk uji)
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

// ---------------------------------------------------------------------------
// KONFIGURASI MAHASISWA — isi nilai di bawah ini
// ---------------------------------------------------------------------------

// ISI: pin GPIO tempat kabel data DHT22 ke ESP32 (contoh: 4, 5, 18) — ganti jika bukan 4
#define DHTPIN 4

// ISI: jeda antar pengiriman data, dalam SATUAN MILLISECOND (ms)
const unsigned long DELAY_KIRIM_MS = 10000;

// ISI: SSID dan password WiFi (pastikan 2,4 GHz jika ESP32 tidak support 5 GHz)
const char* ssid = "<WIFI_SSID>";
const char* password = "<WIFI_PASSWORD>";

const char* topic = "digitech/uts-iot/NPM Anda";

// ISI: nama Anda 
const char* nama = "<Nama Anda>";

// ---------------------------------------------------------------------------
// Opsi broker MQTT 
// ---------------------------------------------------------------------------
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// ---------------------------------------------------------------------------
// Sisa kode (tidak perlu diubah kecuali diminta dosen)
// ---------------------------------------------------------------------------

#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

void connectWiFi();
void connectMQTT();
void publishSuhu(float suhu);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=== UTS: ESP32 DHT22 + MQTT (publish) ===");

  dht.begin();
  connectWiFi();

  mqttClient.setServer(mqtt_server, mqtt_port);
  connectMQTT();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi terputus, menunggu reconnect...");
    connectWiFi();
  }

  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  float suhu = dht.readTemperature();
  if (isnan(suhu)) {
    Serial.println("Gagal membaca DHT22, cek kabel/pin DHT");
    delay(2000);
    return;
  }

  Serial.print("Suhu: ");
  Serial.println(suhu);
  publishSuhu(suhu);

  delay(DELAY_KIRIM_MS);
}

void connectWiFi() {
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int coba = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    coba++;
    if (coba > 60) {
      Serial.println();
      Serial.println("Gagal konek WiFi. Cek SSID/password, lalu reset board.");
      delay(10000);
      return;
    }
  }

  Serial.println();
  Serial.println("WiFi tersambung");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  int percobaan = 0;
  while (!mqttClient.connected()) {
    String clientId = "uts-esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX) + "-";
    clientId += String(percobaan);
    Serial.print("MQTT: mencoba sambung sebagai ");
    Serial.println(clientId);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("MQTT tersambung");
      return;
    }

    Serial.print("Gagal MQTT, rc=");
    Serial.print(mqttClient.state());
    Serial.println(" — ulang 2 dtk");
    delay(2000);
    percobaan++;
  }
}

void publishSuhu(float suhu) {
  // Payload JSON: nama, suhu, timestamp (millis) — sesuaikan bila diminta dosen
  String payload = "{\"nama\":\"";
  payload += nama;
  payload += "\",\"suhu\":";
  payload += String(suhu, 2);
  payload += ",\"timestamp_millis\":";
  payload += String(millis());
  payload += "}";

  bool ok = mqttClient.publish(topic, payload.c_str());
  Serial.print("Publish [");
  Serial.print(topic);
  Serial.print("] => ");
  Serial.println(ok ? "berhasil" : "gagal");
  Serial.println(payload);
}
