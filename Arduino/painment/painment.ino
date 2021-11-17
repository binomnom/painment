#include <LSS.h>
#include <SoftwareSerial.h>
#include <WiFiNINA.h>
#include <MQTT.h>
#include "credentials.h"

#define BTN 8
// give the id matching your device
#define LSS_ID (0)


// internal variables
WiFiClient wifi;
MQTTClient mqtt;
int status = WL_IDLE_STATUS;
int amount = 0;
SoftwareSerial servoSerial(8, 9);
// Create one LSS object
LSS myLSS = LSS(LSS_ID);


void connect() {
  while (!mqtt.connect("vest", MQTT_NAME, MQTT_SECRET)) {
    delay(800);
  }
}


void mqtt_received(String &topic, String &payload) {
  // if in the right topic, set flag "amount" to message payload
  if ( topic == "tighten") {
    amount = payload.toInt();
  }
}


void setup() {
  // initialise GPIO
  pinMode(BTN, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // initialise Servo
  servoSerial.begin(LSS_DefaultBaud);
  LSS::initBus(servoSerial, LSS_DefaultBaud);
  // clear serial buffer
  servoSerial.print("#0D1500\r");

  // connect to WLAN
  while (status != WL_CONNECTED) {
    status = WiFi.begin(WIFI_SSID, WIFI_PASS);
    // wait for connection:
    delay(6000);
  }
  digitalWrite(LED_BUILTIN, HIGH);

  // connect to MQTT Broker
  mqtt.begin(MQTT_URI, wifi);
  mqtt.onMessage(mqtt_received);
  connect();
  // subscribe to topic
  mqtt.subscribe("tighten");

}

void loop() {
  mqtt.loop();

  // check for lost connection
  if (!mqtt.connected()) {
    connect();
    mqtt.subscribe("tighten");
  }
  
  // check instruction flag "amount"
  if (amount > 0) {
    myLSS.moveRelative(-1800);
    delay(700);
    myLSS.moveRelative(1800);
    delay(300);
    amount = 0;
  }
}
