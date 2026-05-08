/*
  Board A (Sensor): Ultrasonic -> MQTT Publisher

  Alur:
  - Baca jarak dari HC-SR04
  - Publish ke topic: digitech/pertemuan7/ultrasonic/distance
  - Format payload: angka cm (contoh: 27.45)

  Library:
  - PubSubClient (by Nick O'Leary)
*/

#include <WiFi.h>
#include <PubSubClient.h>

// ------------------ Konfigurasi WiFi & MQTT ------------------
const char* ssid = "<WIFI_SSID>";
const char* password = "<WIFI_PASSWORD>";

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

const char* topicDistance = "digitech/pertemuan7/ultrasonic/distance";

// ------------------ Konfigurasi Pin Ultrasonic ------------------
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

const unsigned long PUBLISH_INTERVAL_MS = 1000;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastPublish = 0;

void connectWiFi();
void connectMQTT();
float readDistanceCm();

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Board A: Sensor Ultrasonic MQTT ===");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  connectWiFi();
  mqttClient.setServer(mqtt_server, mqtt_port);
  connectMQTT();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqttClient.connected()) connectMQTT();
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL_MS) {
    lastPublish = now;
    float distance = readDistanceCm();

    if (distance < 0) {
      Serial.println("Gagal baca ultrasonic.");
      return;
    }

    String payload = String(distance, 2);
    bool ok = mqttClient.publish(topicDistance, payload.c_str());

    Serial.print("Distance: ");
    Serial.print(payload);
    Serial.print(" cm | publish: ");
    Serial.println(ok ? "OK" : "GAGAL");
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("WiFi konek ke: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    retry++;
    if (retry > 60) {
      Serial.println();
      Serial.println("WiFi gagal. Cek SSID/password.");
      delay(2000);
      return;
    }
  }
  Serial.println();
  Serial.print("WiFi OK, IP: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    String clientId = "board-a-ultra-";
    clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

    Serial.print("MQTT konek: ");
    Serial.println(clientId);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("MQTT tersambung.");
      return;
    }

    Serial.print("MQTT gagal rc=");
    Serial.print(mqttClient.state());
    Serial.println(", ulang 2 detik.");
    delay(2000);
  }
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);  // timeout 30ms
  if (duration == 0) return -1.0;

  float distance = duration * 0.0343f / 2.0f;
  return distance;
}
