/*
  Pertemuan 7 - Mini Project MQTT Kontrol Lampu/Relay/Buzzer (ESP32)

  Fungsi:
  - Subscribe topic perintah: digitech/pertemuan7/lampu/cmd
  - Payload "ON"  => actuator menyala
  - Payload "OFF" => actuator mati
  - Publish status ke: digitech/pertemuan7/lampu/status

  Library yang diperlukan (Arduino Library Manager):
  - PubSubClient (by Nick O'Leary)
*/

#include <WiFi.h>
#include <PubSubClient.h>

// ---------------------------------------------------------------------------
// KONFIGURASI (isi sesuai WiFi dan broker)
// ---------------------------------------------------------------------------
const char* ssid = "<WIFI_SSID>";
const char* password = "<WIFI_PASSWORD>";

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

const char* topicCmd = "digitech/pertemuan7/lampu/cmd";
const char* topicStatus = "digitech/pertemuan7/lampu/status";

// Ganti sesuai pin output yang dipakai
// Contoh:
// - Relay IN  : 26
// - Buzzer +  : 26
const int ACTUATOR_PIN = 26;

// Beberapa relay modul aktif LOW.
// Jika relay Anda aktif LOW, ubah ke true.
const bool RELAY_ACTIVE_LOW = false;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

bool isOn = false;

void connectWiFi();
void connectMQTT();
void setActuator(bool on);
void publishStatus();
void mqttCallback(char* topic, byte* payload, unsigned int length);

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Pertemuan 7: MQTT Kontrol Lampu ===");

  pinMode(ACTUATOR_PIN, OUTPUT);
  setActuator(false);  // default mati saat boot

  connectWiFi();

  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback);
  connectMQTT();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!mqttClient.connected()) {
    connectMQTT();
  }

  mqttClient.loop();
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Menghubungkan WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int coba = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    coba++;
    if (coba > 60) {
      Serial.println();
      Serial.println("Gagal konek WiFi. Cek SSID/password.");
      delay(2000);
      return;
    }
  }

  Serial.println();
  Serial.print("WiFi tersambung, IP: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    String clientId = "esp32-p7-";
    clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

    Serial.print("MQTT konek sebagai ");
    Serial.println(clientId);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("MQTT tersambung");
      mqttClient.subscribe(topicCmd);
      Serial.print("Subscribe: ");
      Serial.println(topicCmd);
      publishStatus();
      return;
    }

    Serial.print("MQTT gagal, rc=");
    Serial.print(mqttClient.state());
    Serial.println(" -> ulang 2 detik");
    delay(2000);
  }
}

void setActuator(bool on) {
  isOn = on;

  if (RELAY_ACTIVE_LOW) {
    digitalWrite(ACTUATOR_PIN, on ? LOW : HIGH);
  } else {
    digitalWrite(ACTUATOR_PIN, on ? HIGH : LOW);
  }

  Serial.print("Actuator: ");
  Serial.println(isOn ? "ON" : "OFF");
}

void publishStatus() {
  const char* statusText = isOn ? "ON" : "OFF";
  bool ok = mqttClient.publish(topicStatus, statusText, true);  // retained
  Serial.print("Publish status [");
  Serial.print(topicStatus);
  Serial.print("] => ");
  Serial.println(ok ? statusText : "GAGAL");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String pesan = "";
  for (unsigned int i = 0; i < length; i++) {
    pesan += (char)payload[i];
  }
  pesan.trim();
  pesan.toUpperCase();

  Serial.print("Pesan masuk [");
  Serial.print(topic);
  Serial.print("] => ");
  Serial.println(pesan);

  if (String(topic) == topicCmd) {
    if (pesan == "ON") {
      setActuator(true);
      publishStatus();
    } else if (pesan == "OFF") {
      setActuator(false);
      publishStatus();
    } else {
      Serial.println("Perintah tidak dikenal. Gunakan ON/OFF.");
    }
  }
}
