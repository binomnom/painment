#include <WiFiNINA.h>
#include <MQTT.h>
#include "credentials.h"

#define BTN 8

// internal variables
WiFiClient wifi;
MQTTClient mqtt;
int status = WL_IDLE_STATUS;


void connect() {
  while (!mqtt.connect("remotecontrol", MQTT_NAME, MQTT_SECRET)) {
    delay(800);
  }
}

void mqtt_received(String &topic, String &message) {
  return;
}


void setup()
{
  // initialise GPIO
  pinMode(BTN, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // connect to WLAN
  while (status != WL_CONNECTED) {
    status = WiFi.begin(WIFI_SSID, WIFI_PASS);
    // wait for connection:
    delay(6000);
  }
  // show that wifi is connected
  digitalWrite(LED_BUILTIN, HIGH);

  // connect to MQTT Broker
  mqtt.begin(MQTT_URI, wifi);
  mqtt.onMessage(mqtt_received);
  connect();
}

void loop() {
  mqtt.loop();

  // check for lost connection
  if (!mqtt.connected()) {
    connect();
  }

  // if button pressed, send MQTT message
  if (!digitalRead(BTN)) {
    mqtt.publish("/tighten", "1");
    delay(500);
  }
}
