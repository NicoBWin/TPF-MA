#include <Wire.h>

#define I2C_ADDR 0x70  // Address de comunicación serial I2C del sensor GY-US42V2

void setup() {
  
  // Inicializo los pines para la comunicación I2C
  Wire.begin(21, 22);  // SDA (Serial Data) en GPIO21, SCL (Serial Clock) en GPIO22
  
  // Inicializo la comunicación serial a la computadora
  Serial.begin(115200);
}

void loop() {
  
  // Lectura del sensor de ecos
  Wire.beginTransmission(I2C_ADDR); // Transmito al address de I2C del sensor
  Wire.write(0x51);  // 0x51 mide en centímetros, 0x50 mide en pulgadas
  Wire.endTransmission(); // Dejo de transmitir

  delay(70);  // Timpo para que el sensor responda (al menos 65ms)

  // Hago un request de 2 bytes al sensor (dispositivo esclavo). La distancia se envía como un valor de 16 bits
  Wire.requestFrom(I2C_ADDR, 2);

  if (Wire.available() == 2) {
    uint8_t highByte = Wire.read();  // MSB de la distancia
    uint8_t lowByte = Wire.read();   // LSB de la distancia
    
    int distance = (highByte << 8) | lowByte; // Convierto la distancia a un entero de 16 bits
    
    // Muestro la distancia en el monitor serial COM4
    Serial.print("Distancia: ");
    Serial.print(distance);
    Serial.println(" (cm)");
  }
  
}
