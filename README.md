# Station d'Authentification RFID — Maintenance Distante

Ce projet a été réalisé dans le cadre de la modernisation du parc informatique du **Conseil Économique, Social et Environnemental (CESE)** pour l'épreuve E6 du **BTS CIEL option Informatique et Réseaux**. Il s'agit d'un prototype fonctionnel d'architecture distribuée permettant le déclenchement distant et sécurisé d'actions système (ici, la maintenance interactive via Windows Update) sur un poste Windows cible, initié par le scan d'un badge RFID.

## 📋 Contexte et Réalité Terrain (Pivot de Projet)

Le besoin initial exprimé par le commanditaire prévoyait une chaîne de migration lourde automatisée (jonction Active Directory, GPO, sauvegardes de profils utilisateurs) s'appuyant sur un protocole MQTT et une base MariaDB.

En raison d'un renouvellement simultané des serveurs internes du CESE et de restrictions logiques d'habilitation de sécurité (droits d'administration du domaine AD non extensibles à un projet externe), **le projet a été recentré avec succès** sur un sous-périmètre technique homogène:

* 
**Protocole :** Remplacement de MQTT par des requêtes HTTP REST (JSON) adaptées à la fréquence d'usage.


* 
**Base de données :** Utilisation de SQLite en local pour un fonctionnement agile hors production.


* 
**Action Système :** Exécution de Windows Update en mode interactif asynchrone, validant la même mécanique système qu'un agent de migration complet (appel d'API Windows, privilèges réseau) sans compromettre la sécurité du domaine de production.



---

## 🏗️ Architecture Globale du Système

Le système est réparti de manière hétérogène sur trois machines distinctes connectées au même sous-réseau local (`192.168.20.0/24`):

1. 
**L'Élément Embarqué (Client IoT) :** Un microcontrôleur ESP32 relié à un lecteur RFID RC522 (13,56 MHz) qui capte l'UID des badges MIFARE et l'envoie en HTTP POST.


2. 
**Le Serveur Central (Middleware & Admin) :** Un serveur web Flask hébergé sur un Raspberry Pi 4 qui gère la logique d'autorisation via une base SQLite et expose un dashboard web sécurisé aux administrateurs.


3. 
**L'Agent Cible (Poste Client) :** Un listener PowerShell résident sur le poste Windows qui réceptionne les requêtes de déclenchement du serveur et lance l'action système de manière asynchrone.



```
┌───────────────┐                  ┌────────────────────────┐                  ┌───────────────┐
│     ESP32     │  HTTP POST JSON  │ Raspberry Pi 4 (Flask) │  HTTP POST JSON  │  Poste Client │
│   + RC522     ├─────────────────►│   + Base SQLite db     ├─────────────────►│ Windows 10/11 │
│ (Badge Scan)  │   (/api/badge)   │  (Dashboard Web CRUD)  │    (/trigger)    │ (PS Listener) │
└───────────────┘                  └────────────────────────┘                  └───────────────┘

```

---

## 📦 Structure du Répertoire

```text
├── code_esp32/
[cite_start]│   └── code_esp32.ino        # Firmware C++ Arduino pour l'ESP32 + RC522 [cite: 549]
├── serveur_flask/
[cite_start]│   ├── config.py             # Variables de configurations globales [cite: 903]
[cite_start]│   ├── database.py           # Couche d'accès aux données SQLite (Opérations CRUD) [cite: 904]
[cite_start]│   ├── auth.py               # Logique d'authentification et décorateurs de session [cite: 906]
[cite_start]│   ├── server.py             # Application principale et routage API/Dashboard [cite: 907]
│   ├── static/
[cite_start]│   │   └── style.css         # Feuille de style CSS centralisée [cite: 902]
[cite_start]│   └── templates/            # Gabarits Jinja2 pour l'interface web (CRUD, Stats) [cite: 908]
└── listener_powershell/
    [cite_start]└── listener.ps1          # Script d'écoute HTTP et wrapper Windows Update [cite: 606, 703]

```

---

## 🛠️ Configuration et Déploiement

### 1. Partie Embarquée (ESP32)

* 
**Matériel :** ESP32 DevKit V1, Lecteur RC522, câblage SPI exclusif en **3.3V**.


* 
**Câblage :** MISO (GPIO 19), MOSI (GPIO 23), SCK (GPIO 18), SDA/SS (GPIO 5), RST (GPIO 22).


* Ouvrez `code_esp32/code_esp32.ino` dans l'IDE Arduino.
* Renseignez vos constantes réseau (SSID, WiFi Password, et l'URL cible de votre Raspberry Pi).


* Téléversez le programme sur l'ESP32.

### 2. Partie Serveur Central (Raspberry Pi)

* Installez les dépendances requises :
```bash
pip install flask werkzeug

```


* Exécutez le script d'initialisation de la base de données (si non automatisé au lancement).


* Pour assurer la persistance et la tolérance aux pannes en production, configurez l'application en tant que service `systemd` (`rfid-dashboard.service`):


```bash
sudo systemctl enable --now rfid-dashboard.service

```


* **Commandes utiles pour l'audit serveur :**
```bash
[cite_start]sudo systemctl status rfid-dashboard.service      # Statut du service [cite: 16]
[cite_start]sudo journalctl -u rfid-dashboard.service -n 50   # Visualisation des logs [cite: 16]

```



### 3. Partie Agent Client (Poste Windows)

* Modifiez le profil réseau Windows de la carte réseau sur **"Privé"** (pour autoriser les flux entrants sur le port 8080 et le ping ICMP).


* Configurez les règles du pare-feu Windows pour autoriser le port local `8080` (TCP) en entrée.


* Configurez une tâche planifiée via le **Planificateur de tâches Windows** pour lancer le script au démarrage de la session utilisateur en mode furtif (`-WindowStyle Hidden`).


* **Commandes utiles pour le diagnostic :**
```powershell
# Exécuter ou interroger la tâche planifiée
[cite_start]schtasks /run /tn "RFID-Listener" [cite: 17]
[cite_start]schtasks /query /tn "RFID-Listener" /v [cite: 17]

```



---

## 🛡️ Sécurité Implémentée

Bien qu'il s'agisse d'un prototype de démonstration, la sécurité applicative intègre les standards du référentiel informatique:

* 
**Mots de passe :** Hashage fort via l'algorithme robuste **PBKDF2** (avec sel aléatoire) via `werkzeug.security`.


* 
**Protection Web :** Décorateur d'interdiction de routage `@login_required` et cookies de session signés par clé secrète.


* 
**Injections SQL :** Utilisation stricte de requêtes SQL préparées/paramétrées (placeholders `?`) nativement traitées par le driver `sqlite3`.


* 
**Validation des entrées :** Désinfection systématique des chaînes (méthode `.strip()`) et validation stricte des formats d'UID par expressions régulières (`Regex`).



---

## 📈 Améliorations Futures (Phase 2)

Prévues pour réintégrer les objectifs initiaux à la suite des stabilisations d'infrastructure du CESE:

1. 
**Sécurisation IoT :** Implémentation d'un protocole d'authentification par jeton d'API (HMAC ou Bearer Token) entre l'ESP32 et Flask pour éviter le spoofing de scan sur le réseau.


2. 
**Chiffrement :** Activation de flux HTTPS avec certificats SSL/TLS auto-signés via un reverse proxy léger (Caddy ou Nginx).


3. 
**Fusion Multi-Lecteurs :** Ajout d'un lecteur de QR Code (ex: module série GM65) sur l'ESP32 afin de corréler l'identité de l'opérateur (RFID) et l'identité de la machine physique (QR d'inventaire).


4. 
**Changement d'échelle SQL :** Migration de la persistance SQLite vers MariaDB en production (la séparation des responsabilités dans `database.py` rend l'adaptation mineure).
