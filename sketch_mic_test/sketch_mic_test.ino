// Exact copy of the working sketch's setup pattern + simple notify test
#include <Arduino_RouterBridge.h>

static int counter = 0;

void setup() {
    Bridge.begin();
    Monitor.begin();
    delay(200);

    delay(5000);
    Monitor.println("MCU ready | test sketch");
}

void loop() {
    counter++;
    char msg[32];
    snprintf(msg, sizeof(msg), "PING %d", counter);
    Monitor.println(msg);

    // Also try notify like the working sketch does
    Bridge.notify("direction", "front,100");

    delay(2000);
}
