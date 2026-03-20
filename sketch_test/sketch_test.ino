// Minimal test sketch — matches working 4-mic sketch setup pattern
#include <Arduino_RouterBridge.h>

void setup() {
    Bridge.begin();
    Monitor.begin();
    delay(200);

    delay(5000);  // give Linux time
    Monitor.println("HELLO FROM MCU");
}

void loop() {
    Monitor.println("PING");
    delay(2000);
}
