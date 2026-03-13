#include <Wire.h>
#include <Adafruit_AHTX0.h>

Adafruit_AHTX0 aht;
bool sensorOk = false;

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10); // wait for USB CDC to connect
  Wire.begin();
  sensorOk = aht.begin();
}

void loop() {
  if (!sensorOk) {
    Serial.println("AHT20 not found");
    delay(2000);
    return;
  }
  sensors_event_t humidity, temp;
  aht.getEvent(&humidity, &temp);
  Serial.print("Temp: ");
  Serial.print(temp.temperature);
  Serial.print(" C  Humidity: ");
  Serial.print(humidity.relative_humidity);
  Serial.println(" %");
  delay(2000);
}
