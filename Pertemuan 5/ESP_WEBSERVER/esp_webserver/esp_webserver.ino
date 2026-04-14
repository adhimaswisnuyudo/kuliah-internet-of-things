#include <WiFi.h>
#include <WebServer.h>

// ===== WIFI =====
const char* ssid = "adhimasHome";
const char* password = "rahasia1993";

// ===== BUZZER =====
#define BUZZER 4

WebServer server(80);

// ===== HTML PAGE =====
String page = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>Kontrol Buzzer</title>
</head>
<body>
  <h1>IoT Control</h1>
  <button onclick="fetch('/on')">NYALAKAN</button>
  <button onclick="fetch('/off')">MATIKAN</button>
</body>
</html>
)rawliteral";

// ===== HANDLER =====
void handleRoot() {
  server.send(200, "text/html", page);
}

void handleOn() {
  digitalWrite(BUZZER, HIGH);
  server.send(200, "text/plain", "Buzzer ON");
}

void handleOff() {
  digitalWrite(BUZZER, LOW);
  server.send(200, "text/plain", "Buzzer OFF");
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);

  pinMode(BUZZER, OUTPUT);

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // ROUTES
  server.on("/", handleRoot);
  server.on("/on", handleOn);
  server.on("/off", handleOff);

  server.begin();
}

// ===== LOOP =====
void loop() {
  server.handleClient();
}