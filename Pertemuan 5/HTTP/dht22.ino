#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

#define DHTPIN 4
#define DHTTYPE DHT22

const char* ssid = "Ruduk Smoking High Speed 2";
const char* password = "SebatsDulu";

// ⚠️ GANTI dengan IP laptop/server
const char* serverUrl = "http://172.168.101.211:3000/api/suhu";

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();

  Serial.println("Menghubungkan ke WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected!");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  float suhu = dht.readTemperature();

  if (isnan(suhu)) {
    Serial.println("Gagal membaca DHT22!");
    delay(2000);
    return;
  }

  Serial.print("Suhu: ");
  Serial.println(suhu);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Format JSON
    String json = "{\"suhu\":" + String(suhu) + "}";

    Serial.println("Mengirim data ke server...");
    int responseCode = http.POST(json);

    Serial.print("Response Code: ");
    Serial.println(responseCode);

    if (responseCode > 0) {
      String response = http.getString();
      Serial.println("Response Body:");
      Serial.println(response);
    } else {
      Serial.println("Gagal mengirim data!");
    }

    http.end();
  }

  delay(3000);
}