// ---------------------------------------------------------------------------------------
// For installation, the following library needs to be installed under Sketch -> Include Library -> Manage Libraries:
// * ArduinoJson by Benoit Blanchon
//
// The following to libraries need to be downloaded, unpacked and copied to the "Arduino\libraries" folder
// (Required for ESPAsyncWebServer)
// https://github.com/me-no-dev/ESPAsyncWebServer
// https://github.com/me-no-dev/AsyncTCP
//
// Required to make SPIFFS.h work:
// https://github.com/me-no-dev/arduino-esp32fs-plugin/releases/
// see as well: https://randomnerdtutorials.com/install-esp32-filesystem-uploader-arduino-ide/
// ¡The file uploader "ESP32 Sketch Data Upload" only works on Arduino IDE 1.X!
//
// Tutorial: https://www.youtube.com/watch?v=VaNVrE7-AO8&ab_channel=MoThunderz
//
// Written by Nicolás Bustelo - 61431 (last update: 13.10.2024)
// ---------------------------------------------------------------------------------------

#include <WiFi.h>                                     // needed to connect to WiFi
#include <ESPAsyncWebServer.h>                        // needed to create a simple webserver (make sure tools -> board is set to ESP32, otherwise you will get a "WebServer.h: No such file or directory" error)
#include <WebSocketsServer.h>                         // needed for instant communication between client and server through Websockets
#include <ArduinoJson.h>                              // needed for JSON encapsulation (send multiple variables with one string)
#include <SPIFFS.h>                                   // needed for file system


// ---------------------------------------------------------------------------------------
// SENSOR
#include <Wire.h>
#define I2C_ADDR 0x70  // Address de comunicación serial I2C del sensor GY-US42V2

const int LED_PIN = 2;

// ---------------------------------------------------------------------------------------
// IF YOU WANT TO CONNECT TO LOCAL WIFI -> UNCOMMENT THE FOLLOWING DEFINE & write Wifi credentials
//#define USE_INTRANET
#define LOCAL_SSID "LOCAL_NAME"
#define LOCAL_PASS "LOCAL_PASS"

// AccesPoint confuguration:
#define AP_SSID "FREEFALL-1"
#define AP_PASS "123456789"

IPAddress local_IP(192,168,1,1);
IPAddress gateway(192,168,1,1);
IPAddress subnet(255,255,255,0);

// Initialization of webserver and websocket
AsyncWebServer server(80);                            // the server uses port 80 (standard port for websites
WebSocketsServer webSocket = WebSocketsServer(81);    // the websocket uses port 81 (standard port for websockets

// ---------------------------------------------------------------------------------------
// Time Working
const int timeSensing = 10; // In seconds
const int interval = 100;   // In ms! Periodically get data from sensor and sends it to clients
const int webInterval = 500; // In ms! Interval to send data to webPage 

// Global variables
const int ARRAY_LENGTH = ((1000/interval) * timeSensing) + 1;
int sens_vals[ARRAY_LENGTH];
bool meassure = false;

// ---------------------------------------------------------------------------------------
void setup() {
  Serial.begin(115200); // Init serial port for debugging

  if (!SPIFFS.begin()) {
    Serial.println("SPIFFS could not initialize");
    return;
  }

  // SENSOR: Inicializo los pines para la comunicación I2C
  Wire.begin(21, 22);  // SDA (Serial Data) en GPIO21 | SCL (Serial Clock) en GPIO22
  //*****************

  // setup LED channels
  pinMode(LED_PIN, OUTPUT);

  // Starting server
  setupWiFi();

  // START WEBPAGE
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {    // define here wat the webserver needs to do
    request->send(SPIFFS, "/webpage.html", "text/html");           
  });

  server.onNotFound([](AsyncWebServerRequest *request) {
    request->send(404, "text/plain", "File not found");
  });

  server.serveStatic("/", SPIFFS, "/");
  
  webSocket.begin();                                  // start websocket
  webSocket.onEvent(webSocketEvent);                  // define a callback function -> what does the ESP32 need to do when an event from the websocket is received? -> run function "webSocketEvent()"

  server.begin();                                     // start server -> best practise is to start the server after the websocket
}

// ---------------------------------------------------------------------------------------
void loop() {
  webSocket.loop(); 

  // Lectura del sensor Ultrasonido
  Wire.beginTransmission(I2C_ADDR); // Transmito al address de I2C del sensor
  Wire.write(0x51);  // 0x51 mide en centímetros, 0x50 mide en pulgadas
  Wire.endTransmission(); // Dejo de transmitir
  //***************************

  unsigned long now = millis();   // read out the current "time" ("millis()" gives the time in ms since the ESP32 started)
  static unsigned long previousMillis = 0;
  static unsigned long previosMillisWeb = 0;
  static int sampleN = 1;
  static int time = 0;
  
  if (meassure == false){
    previousMillis = 0;
    previosMillisWeb = 0;
    sampleN = 1;
  }

  if ((unsigned long)(now - previousMillis) > interval && meassure) {
    previousMillis = now; // reset previousMillis
    time = sampleN * interval;
    if (time >= (timeSensing*1000)) { //Change timeSensing to miliseconds
      digitalWrite(LED_PIN, LOW);
      meassure = false;
    }

    if(sampleN<ARRAY_LENGTH) {
      // Hago un request de 2 bytes al sensor (dispositivo esclavo). La distancia se envía como un valor de 16 bits
      Wire.requestFrom(I2C_ADDR, 2); //ESTA TARDANDO MUCHO ESTE REQUEST
      static int distance = 0; 
      if (Wire.available() == 2) {
        uint8_t highByte = Wire.read();  // MSB de la distancia
        uint8_t lowByte = Wire.read();   // LSB de la distancia
        distance = (highByte << 8) | lowByte; // Convierto la distancia a un entero de 16 bits
        if(distance == 720) // Filtro porque sensa cada tanto 720
          distance = sens_vals[sampleN-1];
      }

      sens_vals[sampleN] = distance; // sens_vals[sampleN-1] + 10; // Es como ejemplo
      sampleN++;
    }
    else {
      for(int i=0; i < ARRAY_LENGTH-1; i++) {
        sens_vals[i] = sens_vals[i+1];
      }
      sens_vals[ARRAY_LENGTH-1] = sens_vals[ARRAY_LENGTH-1] + 10;
    }
    //Serial.println(now);
    if ((unsigned long)(now - previosMillisWeb) > webInterval || meassure == false) {
      previosMillisWeb = now; // reset previousMillis
      sendJsonArray("graph_update", sens_vals);
    }
  }
}

// ---------------------------------------------------------------------------------------
void setupWiFi() {
#ifdef USE_INTRANET
    connectToWiFi();
#else
    setupAccessPoint();
#endif
}

void connectToWiFi() {
    Serial.print("Connecting to local network...");
    WiFi.begin(LOCAL_SSID, LOCAL_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println(" Connected!");
    Serial.print("IP address: "); Serial.println(WiFi.localIP());
}

void setupAccessPoint() {
    Serial.print("Setting up Access Point ... ");
    WiFi.softAPConfig(local_IP, gateway, subnet);
    WiFi.softAP(AP_SSID, AP_PASS);
    Serial.print("AP IP address: "); Serial.println(WiFi.softAPIP());
    //WiFi.setTxPower(WIFI_POWER_8_5dBm); // To use lower power
}

// ---------------------------------------------------------------------------------------
// Callback for webSocket
void webSocketEvent(byte num, WStype_t type, uint8_t * payload, size_t length) {      // the parameters of this callback function are always the same -> num: id of the client who send the event, type: type of message, payload: actual data sent and length: length of payload
  switch (type) {                                     // switch on the type of information sent
    case WStype_DISCONNECTED:                         // if a client is disconnected, then type == WStype_DISCONNECTED
      Serial.println("Client " + String(num+1) + " disconnected");
      break;
    case WStype_CONNECTED:                            // if a client is connected, then type == WStype_CONNECTED
      Serial.println("Client " + String(num+1) + " connected");    
      sendJsonArray("graph_update", sens_vals); //Sends first datas
      break;
    case WStype_TEXT:                                 // if a client has sent data, then type == WStype_TEXT
      // try to decipher the JSON string received
      StaticJsonDocument<200> doc;                    // create JSON container 
      DeserializationError error = deserializeJson(doc, payload);
      if (error) {
        Serial.print(F("deserializeJson() failed: "));
        Serial.println(error.f_str());
        return;
      }
      else {
        // JSON string was received correctly, so information can be retrieved:
        const char* l_type = doc["type"];
        Serial.println("Type: " + String(l_type));

        // IF PLAY -> TURN ON LED
        if(String(l_type) == "PLAY") {
          digitalWrite(LED_PIN, HIGH);
          meassure = true;
        }
        // else if LED_select is changed -> switch on LED and switch off the rest
        if(String(l_type) == "RESET") {
          digitalWrite(LED_PIN, LOW);
          meassure = false;
          for(int i=0; i < ARRAY_LENGTH; i++) {
            sens_vals[i] = 0;
          }
          sendJsonArray("graph_update", sens_vals);
        }
      }
      Serial.println("");
      break;
  }
}

// ---------------------------------------------------------------------------------------
// Simple function to send information to the web clients
void sendJson(String l_type, String l_value) {
    String jsonString = "";                           // create a JSON string for sending data to the client
    StaticJsonDocument<200> doc;                      // create JSON container
    JsonObject object = doc.to<JsonObject>();         // create a JSON Object
    object["type"] = l_type;                          // write data into the JSON object
    object["value"] = l_value;
    serializeJson(doc, jsonString);                   // convert JSON object to string
    webSocket.broadcastTXT(jsonString);               // send JSON string to all clients
}

// Simple function to send information to the web clients
void sendJsonArray(String l_type, int l_array_values[]) {
    String jsonString = "";                           // create a JSON string for sending data to the client
    const size_t CAPACITY = JSON_ARRAY_SIZE(ARRAY_LENGTH) + 100;
    StaticJsonDocument<CAPACITY> doc;                      // create JSON container
    
    JsonObject object = doc.to<JsonObject>();         // create a JSON Object
    object["type"] = l_type;                          // write data into the JSON object
    JsonArray value = object.createNestedArray("value");
    for(int i=0; i<ARRAY_LENGTH; i++) {
      value.add(l_array_values[i]);
    }
    serializeJson(doc, jsonString);                   // convert JSON object to string
    webSocket.broadcastTXT(jsonString);               // send JSON string to all clients
}