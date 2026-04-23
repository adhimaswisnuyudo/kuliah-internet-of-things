// Blink LED sederhana untuk ESP32 Wemos D1 R32
// LED bawaan biasanya di GPIO2

#define LED_PIN 2

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH); // LED ON
  delay(1000);                // tunggu 1 detik

  digitalWrite(LED_PIN, LOW); // LED OFF
  delay(1000);                // tunggu 1 detik
}