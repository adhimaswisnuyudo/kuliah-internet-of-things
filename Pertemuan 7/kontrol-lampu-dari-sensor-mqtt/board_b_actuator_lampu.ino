/*
  Board B (Actuator): MQTT Subscriber -> Lampu/Relay

  Alur:
  - Subscribe topic: digitech/pertemuan7/ultrasonic/distance
  - Jika jarak <= 30 cm => lampu ON
  - Jika jarak > 30 cm  => lampu OFF
  - Publish status lampu ke: digitech/pertemuan7/lampu/status

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
const char* topicLampStatus = "digitech/pertemuan7/lampu/status";

// ------------------ Konfigurasi Actuator ------------------
const int LAMP_PIN = 26;
const bool RELAY_ACTIVE_LOW = false;
const float THRESHOLD_CM = 30.0;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

bool lampOn = false;

void connectWiFi();
void connectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void setLamp(bool on);
void publishLampStatus();

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Board B: Actuator Lampu MQTT ===");

  pinMode(LAMP_PIN, OUTPUT);
  setLamp(false);  // default mati

  connectWiFi();
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback);
  connectMQTT();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqttClient.connected()) connectMQTT();
  mqttClient.loop();
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
    String clientId = "board-b-lamp-";
    clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

    Serial.print("MQTT konek: ");
    Serial.println(clientId);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("MQTT tersambung.");
      mqttClient.subscribe(topicDistance);
      Serial.print("Subscribe: ");
      Serial.println(topicDistance);
      publishLampStatus();
      return;
    }

    Serial.print("MQTT gagal rc=");
    Serial.print(mqttClient.state());
    Serial.println(", ulang 2 detik.");
    delay(2000);
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) != topicDistance) return;

  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  msg.trim();

  float distance = msg.toFloat();
  Serial.print("Jarak masuk: ");
  Serial.print(distance, 2);
  Serial.println(" cm");

  if (distance <= THRESHOLD_CM) {
    setLamp(true);
  } else {
    setLamp(false);
  }
}

void setLamp(bool on) {
  if (lampOn == on) return;

  lampOn = on;
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(LAMP_PIN, on ? LOW : HIGH);
  } else {
    digitalWrite(LAMP_PIN, on ? HIGH : LOW);
  }

  Serial.print("Lampu: ");
  Serial.println(lampOn ? "ON" : "OFF");
  publishLampStatus();
}

void publishLampStatus() {
  const char* statusText = lampOn ? "ON" : "OFF";
  bool ok = mqttClient.publish(topicLampStatus, statusText, true);
  Serial.print("Publish status lampu: ");
  Serial.println(ok ? statusText : "GAGAL");
}
