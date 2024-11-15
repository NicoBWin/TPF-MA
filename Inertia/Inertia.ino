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
#include <Arduino.h>
const int pinA = 34; // Fase A a GPIO34
const int pinB = 35; // Fase B a GPIO35
volatile int position = 0; // Posición incremental del encoder
volatile bool lastA = LOW; // Última lectura de la fase A
// ---------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------
// IF YOU WANT TO CONNECT TO LOCAL WIFI -> UNCOMMENT THE FOLLOWING DEFINE & write Wifi credentials
//#define USE_INTRANET
#define LOCAL_SSID "LOCAL_NAME"
#define LOCAL_PASS "LOCAL_PASS"

// AccesPoint confuguration:
#define AP_SSID "INERTIA-1"
#define AP_PASS "123456789"

IPAddress local_IP(192,168,1,1);
IPAddress gateway(192,168,1,1);
IPAddress subnet(255,255,255,0);

// Initialization of webserver and websocket
AsyncWebServer server(80);                            // the server uses port 80 (standard port for websites
WebSocketsServer webSocket = WebSocketsServer(81);    // the websocket uses port 81 (standard port for websockets

// ---------------------------------------------------------------------------------------
// Time Working
const int timeSensing = 15; // In seconds
const int interval = 5;   // In ms! Periodically get data from sensor and sends it to clients
const int webInterval = 7500; // In ms! Interval to send data to webPage 

// Global variables
const int ARRAY_LENGTH = ((1000/interval) * timeSensing) + 1;
float sens_vals[ARRAY_LENGTH];
bool meassure = false;

// ---------------------------------------------------------------------------------------
void setup() {
  Serial.begin(115200); // Init serial port for debugging

  // SENSOR: Inicializo los pines para leer el encoder
  pinMode(pinA, INPUT); // Inicializo la fase A
  pinMode(pinB, INPUT); // Inicializo la fase B
  attachInterrupt(digitalPinToInterrupt(pinA), updateEncoder, CHANGE); // Inicializo interrupción para cuando se mueve el encoder (cambia la fase A) con su función de callback
  //*****************

  if (!SPIFFS.begin()) {
    Serial.println("SPIFFS could not initialize");
  }

  // setup LED channels
  pinMode(2, OUTPUT);

  Serial.println("Starting server");
  #ifdef USE_INTRANET
    Serial.print("Connecting to local network ...");
    WiFi.begin(LOCAL_SSID, LOCAL_PASS);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println(" Ready");
    Serial.print("IP address: "); Serial.println(WiFi.localIP());
  #endif

  #ifndef USE_INTRANET
    Serial.print("Setting up Access Point ... ");
    Serial.println(WiFi.softAPConfig(local_IP, gateway, subnet) ? "Ready" : "Failed!");

    Serial.print("Starting Access Point ... ");
    Serial.println(WiFi.softAP(AP_SSID, AP_PASS) ? "Ready" : "Failed!");

    Serial.print("IP address = ");
    Serial.println(WiFi.softAPIP());
    WiFi.setTxPower(WIFI_POWER_8_5dBm); // To use lower power
  #endif

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

  unsigned long now = millis();   // read out the current "time" ("millis()" gives the time in ms since the ESP32 started)
  static unsigned long previousMillis = 0;
  static unsigned long previosMillisWeb = 0;
  static int sampleN = 1;
  static int time = 0;
  
  //Serial.print("Posición: ");
  //Serial.println(position);

  if (meassure == false){
    previousMillis = 0;
    previosMillisWeb = 0;
    position = 0;
    sampleN = 1;
  }

  if ((unsigned long)(now - previousMillis) > interval && meassure) {
    previousMillis = now; // reset previousMillis
    time = sampleN * interval;
    if (time >= (timeSensing*1000)) { //Change timeSensing to miliseconds
      digitalWrite(2, LOW);
      meassure = false;
    }

    if(sampleN<ARRAY_LENGTH) {
      sens_vals[sampleN] = (position * 0.6 * 3.141592) / 180; // Position del encoder
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

//Callback for encoder
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
        //const int l_value = doc["value"];
        //Serial.println("Type: " + String(l_type));
        //Serial.println("Value: " + String(l_value));

        // IF PLAY -> TURN ON LED
        if(String(l_type) == "PLAY") {
          digitalWrite(2, HIGH);
          meassure = true;
        }
        // IF RESET -> TURN OFF LED
        if(String(l_type) == "RESET") {
          digitalWrite(2, LOW);
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
void sendJsonArray(String l_type, float l_array_values[]) {
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
