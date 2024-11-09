#include <Arduino.h>

const int pinA = 34; // Fase A a GPIO34
const int pinB = 35; // Fase B a GPIO35

volatile int position = 0; // Posición incremental del encoder
volatile bool lastA = LOW; // Última lectura de la fase A

void setup() {
    Serial.begin(115200); // Inicializo la comunicación serial (baudrate: 115200 baud)
    pinMode(pinA, INPUT); // Inicializo la fase A
    pinMode(pinB, INPUT); // Inicializo la fase B
    attachInterrupt(digitalPinToInterrupt(pinA), updateEncoder, CHANGE); // Inicializo interrupción para cuando se mueve el encoder (cambia la fase A) con su función de callback
}

void loop() {
    // Muestro la posición actual
    Serial.print("Posición: ");
    Serial.println(position);
    delay(25);
}

void updateEncoder() {
    bool currentA = digitalRead(pinA); // Estado acutal de la fase A
    bool currentB = digitalRead(pinB); // Estado actual de la fase B

    if (lastA == LOW && currentA == HIGH) { // Verifico si A cambia
        // Si A cambia, analizo si la rotación es horaria o antihoraria con la fase B
        if (currentB == LOW) {
            position++; // Rotación horaria
        } else {
            position--; // Rotación antihoraria
        }
    }
    lastA = currentA; // Actualizo el estado de la fase A
}
