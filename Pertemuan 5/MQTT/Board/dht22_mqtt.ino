#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

// ===== KONFIGURASI SENSOR =====
#define DHTPIN 4
#define DHTTYPE DHT22

// ===== KONFIGURASI WIFI =====
const char* ssid = "<SSID WIFI>";
const char* password = "<PASSWORD WIFI>";

// ===== KONFIGURASI MQTT =====
// Rekomendasi: broker.hivemq.com (public broker untuk praktikum)
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// Topic publish data suhu
const char* topic_suhu = "iot/digitech-adhimas/suhu";

// Nama board/pengirim
const char* nama_anda = "Nama Anda";

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

void connectWiFi();
void connectMQTT();
void publishSuhu(float suhu);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== START PROGRAM IoT MQTT ===");

  dht.begin();
  connectWiFi();

  mqttClient.setServer(mqtt_server, mqtt_port);
  connectMQTT();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi terputus, reconnect...");
    connectWiFi();
  }

  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  float suhu = dht.readTemperature();
  if (isnan(suhu)) {
    Serial.println("Gagal membaca DHT22");
    delay(2000);
    return;
  }

  Serial.print("Suhu: ");
  Serial.println(suhu);
  publishSuhu(suhu);

  delay(5000);
}

void connectWiFi() {
  Serial.println("Menghubungkan ke WiFi...");
  WiFi.begin(ssid, password);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    retry++;

    if (retry > 40) {
      Serial.println("\nGagal konek WiFi. Restart board...");
      ESP.restart();
    }
  }

  Serial.println("\nWiFi Connected");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    String clientId = "esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    Serial.print("Koneksi MQTT sebagai ");
    Serial.println(clientId);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("MQTT Connected");
    } else {
      Serial.print("MQTT gagal, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" coba lagi 2 detik");
      delay(2000);
    }
  }
}

void publishSuhu(float suhu) {
  String payload = "{\"nama_anda\":\"" + String(nama_anda) + "\",\"suhu\":" + String(suhu, 2) + ",\"timestamp\":" + String(millis()) + "}";
  bool ok = mqttClient.publish(topic_suhu, payload.c_str());

  Serial.print("Publish ke topic ");
  Serial.print(topic_suhu);
  Serial.print(" -> ");
  Serial.println(ok ? "BERHASIL" : "GAGAL");
  Serial.println(payload);
}
