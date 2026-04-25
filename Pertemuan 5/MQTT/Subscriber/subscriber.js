const mqtt = require("mqtt");

const brokerUrl = process.env.MQTT_URL || "mqtt://broker.hivemq.com:1883";
const topic = process.env.MQTT_TOPIC || "iot/digitech-ridwan/suhu";

const client = mqtt.connect(brokerUrl, {
  reconnectPeriod: 2000,
});

client.on("connect", () => {
  console.log("Terhubung ke broker:", brokerUrl);
  client.subscribe(topic, (err) => {
    if (err) {
      console.error("Gagal subscribe:", err.message);
      return;
    }
    console.log("Subscribe topic:", topic);
  });
});

client.on("message", (msgTopic, payloadBuffer) => {
  const payloadText = payloadBuffer.toString();
  const waktu = new Date().toLocaleTimeString();

  try {
    const data = JSON.parse(payloadText);
    console.log(`[${waktu}] ${msgTopic} | ${data.nama_anda} | ${data.suhu} C`);
  } catch (e) {
    console.log(`[${waktu}] ${msgTopic} | ${payloadText}`);
  }
});

client.on("reconnect", () => {
  console.log("Mencoba reconnect ke broker...");
});

client.on("error", (err) => {
  console.error("MQTT Error:", err.message);
});
