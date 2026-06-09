#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>

// === CONFIGURATION RFID ===
#define SS_PIN  5
#define RST_PIN 22
MFRC522 rfid(SS_PIN, RST_PIN);

// === CONFIGURATION RESEAU === <- MODIFIER CES VALEURS
const char* WIFI_SSID = "TP-Link_4F54";
const char* WIFI_PASS = "jbs2025*";
const char* RPI_URL   = "http://192.168.20.105:5000/api/badge";

// === CONNEXION WIFI ===
void connectWifi() {
    Serial.print("Connexion Wi-Fi");
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWi-Fi connecte ! IP : " + WiFi.localIP().toString());
}

void setup() {
    Serial.begin(115200);
    delay(2000);          // Attendre l'init USB
    SPI.begin();
    rfid.PCD_Init();
    connectWifi();
    Serial.println("--- Systeme pret, approchez un badge ---");
}

void loop() {
    // Reconnexion automatique si Wi-Fi perdu
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Wi-Fi perdu, reconnexion...");
        connectWifi();
    }

    if (!rfid.PICC_IsNewCardPresent()) return;
    if (!rfid.PICC_ReadCardSerial())   return;

    // Construire l'UID en hexadecimal (ex : 5E:ED:DB:6F)
    String uid = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
        uid += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
        uid += String(rfid.uid.uidByte[i], HEX);
        if (i < rfid.uid.size - 1) uid += ":";
    }
    uid.toUpperCase();
    Serial.println("Badge detecte : " + uid);

    // Envoyer l'UID au Raspberry Pi
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(RPI_URL);
        http.addHeader("Content-Type", "application/json");

        String body = "{\"uid\":\"" + uid + "\"}";
        int code = http.POST(body);

        if (code > 0) {
            Serial.println("RPI reponse : " + http.getString());
        } else {
            Serial.println("Erreur HTTP : " + String(code));
        }
        http.end();
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    delay(1000);
}