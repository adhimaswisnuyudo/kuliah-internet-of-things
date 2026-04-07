#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

// ===== KONFIG =====
#define DHTPIN 4
#define DHTTYPE DHT22

const char* ssid = "<SSID WIFI>";
const char* password = "<PASSWORD WIFI>";

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

const char* topic = "iot/digitech-adhimas/suhu";

// ===== INIT =====
WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

// ===== WIFI =====
void connectWiFi() {
  Serial.println("🔌 Connecting WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// ===== MQTT =====
void connectMQTT() {
  while (!client.connected()) {
    Serial.println("📡 Connecting MQTT...");

    if (client.connect("ESP32Client")) {
      Serial.println("✅ MQTT Connected!");
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.print(client.state());
      Serial.println(" retry...");
      delay(2000);
    }
  }
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=== MQTT IoT START ===");

  dht.begin();

  connectWiFi();

  client.setServer(mqtt_server, mqtt_port);
}

// ===== LOOP =====
void loop() {
  if (!client.connected()) {
    connectMQTT();
  }

  client.loop();

  float suhu = dht.readTemperature();

  if (isnan(suhu)) {
    Serial.println("❌ Gagal baca DHT22");
    delay(2000);
    return;
  }

  Serial.print("🌡️ Suhu: ");
  Serial.println(suhu);

  // kirim ke MQTT
  String payload = String(suhu);

  client.publish(topic, payload.c_str());

  Serial.println("📤 Data dikirim ke MQTT");

  delay(5000);
}