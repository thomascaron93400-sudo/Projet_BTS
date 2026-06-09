# CLAUDE.md — Rédaction du rapport BTS CIEL E6

## Mission

Rédiger un **rapport professionnel d'environ 30 pages** au format **Word (.docx)** pour l'épreuve **E6 du BTS CIEL option Informatique et Réseaux**.

Le rapport présente le projet réalisé par **Thomas Caron** (étudiant 1, option IR), commandité par le **CESE (Conseil Économique, Social et Environnemental)**, dans le cadre d'une mission de modernisation et d'administration de parc informatique.

**Fichier de sortie attendu :** `Rapport_E6_RFID_Caron.docx` à la racine du dépôt.

---

## Contexte du projet (à ne pas réinventer)

### Commanditaire

- **Entreprise** : CESE (Conseil Économique, Social et Environnemental)
- **Adresse** : 9 place d'Iéna, 75016 Paris
- **Contact projet** : Matthieu Mainviel
- **Origine du projet** : entreprise (idée, cahier des charges et suivi tous du côté CESE)
- **Étudiant en charge** : Thomas Caron, équipe individuelle

### Mission initiale demandée par le CESE

Le projet initial était **bien plus large** que ce qui a finalement été livré. Il visait la **modernisation complète et automatisée du parc informatique** du CESE, incluant notamment :

1. **Préparation infrastructure et matériel**
   - Boîtier IoT à deux lecteurs : **QR Code ET RFID** (identifiant machine + identifiant utilisateur)
   - Serveur central sur Raspberry Pi avec :
     - **Broker MQTT (Mosquitto)** pour le middleware
     - Serveur web Flask
     - **Base de données MariaDB**
     - Pare-feu UFW, certificats SSL (HTTPS)
   - Préparation matérielle des postes Dell/HP/Lenovo : mise à jour BIOS, image Windows 10/11 standardisée CESE

2. **Développement embarqué C++**
   - Lecture **simultanée** QR + RFID
   - Wi-Fi sécurisé avec reconnexion automatique
   - Gestion d'états visuels par LEDs (attente / validation / erreur)

3. **Agent PowerShell de migration (service Windows)**
   - Boucle de polling HTTP avec token de sécurité
   - **Sauvegarde sécurisée des profils utilisateurs** (Documents, Bureau, Favoris) vers serveur
   - Installation silencieuse de logiciels métiers
   - Configuration de navigateurs
   - **Jonction automatique au domaine Active Directory**
   - Application des GPO de sécurité
   - Configuration pare-feu et antivirus
   - Journalisation temps réel (POST JSON)

4. **Backend Python Flask + MariaDB**
   - Tables `Inventaire_PC`, `Utilisateurs`, `Logs_Migration`
   - Routes API REST : `/check-status`, `/update-log`
   - Réception MQTT, validation croisée QR↔Badge

5. **Validation et documentation**
   - Tests d'intégration
   - Tests de résilience (coupure Wi-Fi, redémarrage serveur)
   - Schéma d'architecture, procédures d'installation agent, guide utilisateur

### Difficultés rencontrées qui ont conduit à un recentrage

L'étudiant a rencontré des **difficultés liées à l'infrastructure informatique du CESE** (à détailler avec lui — voir section "À demander à l'étudiant") qui ont rendu impossible la réalisation du projet dans son périmètre initial. Il a donc **dévié de manière maîtrisée** vers un sous-périmètre techniquement homogène, livrable dans le temps imparti, et démontrant les compétences IR du référentiel.

**Le rapport doit présenter cette évolution avec honnêteté et intelligence technique** — pas comme un échec, mais comme une **adaptation professionnelle** face à des contraintes réelles. C'est exactement ce qu'un jury BTS valorise : la capacité à reformuler le besoin face à un blocage et à livrer quelque chose qui a du sens.

### Projet effectivement livré (v2)

**Une station d'authentification RFID** qui :
- Lit un badge sur un ESP32 (lecteur RC522)
- Transmet l'UID au Raspberry Pi via HTTP (au lieu de MQTT)
- Vérifie l'autorisation en base **SQLite** (au lieu de MariaDB)
- Si autorisé, déclenche sur un PC Windows une **vérification interactive des mises à jour Windows Update** (`Get-WindowsUpdate` + boîte de dialogue Oui/Non)
- Trace tous les passages dans un historique
- Offre une **interface web d'administration** avec login, gestion CRUD des badges, statistiques, graphiques

C'est un **prototype fonctionnel et démontrable** d'une brique du projet initial, focalisée sur :
- La **chaîne IoT → serveur → action distante**
- La **gestion fine d'un parc de badges**
- Une **action de maintenance système** (Windows Update) au lieu de la migration complète

---

## Stratégie de narration du rapport — le point sensible

Le rapport doit raconter une **trajectoire professionnelle cohérente**, pas une suite d'erreurs. La structure narrative attendue :

1. **Voici le besoin du CESE** (le projet ambitieux original — décrit avec sérieux comme une vraie mission d'entreprise)
2. **Voici les contraintes rencontrées sur le terrain** (à expliciter avec l'étudiant — typiquement : accès AD restreint, refus d'accès à certains réseaux, contraintes de sécurité institutionnelle empêchant la jonction au domaine, indisponibilité de l'infrastructure MariaDB/MQTT, etc.)
3. **Voici comment j'ai recentré le projet** sur un livrable maîtrisable qui démontre les compétences attendues
4. **Voici ce que j'ai livré** et pourquoi c'est techniquement intéressant
5. **Voici ce qui reste à faire** dans une éventuelle phase 2 (réintégration progressive des briques initiales)

Cette structure doit être **assumée**, pas masquée. Le jury voit immédiatement qu'un projet de modernisation de parc CESE ne tient pas dans un projet étudiant individuel de quelques semaines. Tenter de prétendre que c'était le scope initial serait perçu comme malhonnête.

---

## Structure du rapport (≈ 30 pages)

### Page de garde (1 page)
- Titre : "Station d'authentification RFID pour la maintenance distante d'un parc Windows"
- Sous-titre : "Projet réalisé dans le cadre de la modernisation du parc informatique du CESE"
- "Épreuve E6 — BTS CIEL option Informatique et Réseaux"
- Thomas Caron
- Année scolaire (à confirmer avec l'étudiant)
- Nom de l'établissement (à demander)
- Logo CESE si autorisé (à demander)

### Sommaire automatique (1 page)
- Généré par Word à partir des styles `Heading 1`, `Heading 2`, etc.
- Inclure une table des figures séparée

### Remerciements (1/2 page, optionnel)
- À l'équipe IT du CESE et à Matthieu Mainviel
- Aux enseignants
- L'étudiant doit pouvoir personnaliser

### 1. Introduction (1 page)
- Présentation rapide du commanditaire et du projet en quelques phrases
- Annonce du plan
- Mention explicite et assumée du recentrage de scope

### 2. Contexte de l'entreprise et besoin client (3 pages)
- Présentation du **CESE** : rôle institutionnel, missions, taille du parc informatique
- Acteurs IT identifiés (DSI, équipe technique, Matthieu Mainviel)
- Problématique métier : pourquoi moderniser ? (parc obsolète, sécurité, productivité)
- Contraintes propres à une institution publique (sécurité élevée, conformité, gestion des accès stricte)
- **Emplacement schéma** : organigramme contextuel ou photo du site / parc *(à insérer)*

### 3. Cahier des charges initial — version CESE (3 pages)

Présenter **fidèlement** le projet tel que demandé par le CESE, sans le réduire d'emblée à ce qui a été livré.

- **Besoins fonctionnels** (issus de la fiche projet)
  - Remplacement des postes obsolètes
  - Déploiement Windows 10/11 standardisé
  - Installation logiciels institutionnels
  - Configuration de sécurité (antivirus, pare-feu, GPO)
  - Migration données utilisateurs
  - Intégration AD
  - Gestion des arrivants
  - Support technique
- **Besoins techniques**
  - Continuité de service totale
  - Respect des règles de sécurité CESE
  - Documentation des interventions
  - Absence de perte de données
- **Architecture initiale envisagée** (à décrire, sans la critiquer ici)
  - Boîtier IoT QR + RFID
  - MQTT + MariaDB + Flask
  - Agent PowerShell complet
- **Diagrammes SysML** (la fiche mentionne des diagrammes — l'étudiant devra les fournir ou les recréer)
- **Emplacement schéma** : architecture initiale envisagée *(à insérer — peut être un schéma "version cible" pour illustrer l'ambition de départ)*

### 4. Confrontation au terrain et recentrage du projet (4 pages) ⭐ SECTION CLÉ

Section **stratégique pour le jury**. À rédiger avec maturité et lucidité.

#### 4.1 Difficultés rencontrées
À expliciter avec l'étudiant. Pistes probables — **à valider** :
- Accès limité à l'infrastructure AD du CESE (impossible pour un projet étudiant de joindre une machine au domaine d'un établissement public)
- Indisponibilité du droit d'installer MariaDB / Mosquitto sur les serveurs CESE
- Contraintes réseau / pare-feu institutionnel rendant impossible le déploiement d'un agent en production
- Délais de validation des actions sensibles (sauvegarde de profils, GPO) par la DSI
- Calendrier du projet étudiant (quelques semaines) incompatible avec l'ampleur d'une migration de parc

#### 4.2 Décisions de recentrage prises

Pour chaque pivot, présenter la décision et sa justification technique :

| Élément initial | Décision finale | Justification |
|---|---|---|
| Double lecture QR + RFID | RFID seul | La double lecture nécessitait une caméra et un protocole de synchronisation complexes. RFID seul démontre la même chaîne IoT → serveur → action. |
| MQTT (Mosquitto) | HTTP REST | Pas de besoin de pub/sub temps réel pour quelques scans par minute. HTTP est plus simple, mieux maîtrisé et plus facile à déboguer. |
| MariaDB | SQLite | Pas de service tiers à gérer, pas d'utilisateurs SQL à administrer. Volume de données très faible. Sauvegarde = copier un fichier. |
| Agent de migration complet (sauvegarde + AD + GPO + logiciels) | Listener PowerShell ciblé sur Windows Update interactif | Toutes les actions de migration nécessitaient des droits d'administration et un accès AD non accordés. Un listener Windows Update démontre la même mécanique (déclenchement distant d'une action système) sur un cas d'usage compatible avec les droits standards. |
| Service Windows en polling avec token | Listener HTTP push depuis le Pi | Plus simple, sans polling périodique. Démontre les mêmes notions de communication machine-to-machine. |
| Tableau de bord interne complet | Dashboard Flask avec login admin, CRUD badges, historique filtré, statistiques graphiques | Démontre les compétences en développement web full-stack et la dimension administration utilisateur. |

#### 4.3 Ce que démontre le projet final livré

Préciser que **malgré le recentrage**, le projet final couvre toujours les compétences IR du référentiel :
- Architecture client/serveur multi-machines
- Communication par protocole standard (HTTP REST)
- Base de données relationnelle avec opérations CRUD
- Sécurité de base (hash de mot de passe, sessions, validation côté serveur)
- Développement embarqué C++ (ESP32 + RC522)
- Script système (PowerShell + API Windows Update)
- Administration système (services systemd, planificateur Windows, pare-feu)
- Tests par couches et diagnostic réseau

#### 4.4 Ce qui reste atteignable en phase 2
Pour montrer que la vision initiale n'est pas perdue, juste reportée :
- Réintégration de la base sur MariaDB en environnement maîtrisé
- Ajout du second lecteur QR Code
- Extension du listener pour déclencher d'autres actions de maintenance (déploiement d'un patch, lancement d'un inventaire WMI, etc.)
- Test en environnement de pré-production CESE avec droits étendus

### 5. Architecture technique du projet livré (3 pages)

#### 5.1 Vue d'ensemble
- Schéma des 3 machines (ESP32, Raspberry Pi, PC Windows)
- Tableau récapitulatif : machine / IP / port / rôle
- **Emplacement schéma** : architecture globale du système livré *(à insérer)*

#### 5.2 Flux de données détaillé
- Description séquentielle d'un scan : du badge approché jusqu'à la boîte de dialogue Windows Update
- **Emplacement schéma** : diagramme de séquence UML *(à insérer)*

#### 5.3 Modèle de données SQLite
- 3 tables : `badges`, `passages`, `admins`
- Choix de design : pas de FK stricte sur `passages.uid` pour préserver l'historique d'audit même après suppression d'un badge
- **Emplacement schéma** : modèle de données *(à insérer)*

### 6. Réalisation matérielle (2 pages)
- Liste du matériel : ESP32, RC522, Raspberry Pi, PC Windows, badges MIFARE
- Câblage RC522 ↔ ESP32 : tableau des broches
- Point d'attention : alimentation 3.3V du RC522 (jamais 5V)
- Coût total du prototype (budget matériel approximatif — à compléter avec l'étudiant)
- **Emplacement schéma** : photo du montage ou schéma de câblage *(à insérer)*

### 7. Réalisation logicielle (8 pages)

#### 7.1 Code embarqué ESP32 (1 page)
- Rôle : lecture RFID, extraction UID, envoi HTTP au Pi
- Extraits commentés du fichier `.ino`
- Gestion de la reconnexion Wi-Fi automatique
- Choix du format JSON

#### 7.2 Serveur Flask sur Raspberry Pi (3 pages)
- Choix de Flask : framework léger, adapté à des API simples
- **Séparation des responsabilités** : `config.py`, `database.py`, `auth.py`, `server.py`, `templates/`, `static/`
- Routes API (`/api/badge`, `/api/health`) vs routes dashboard
- **Sécurité du dashboard** : sessions Flask, cookies signés, hash PBKDF2 via `werkzeug.security`
- Concept : décorateur `@login_required` (composition de fonctions Python)
- **Requêtes SQL paramétrées** (`?` placeholders) → protection contre l'injection SQL
- Concept : **défense en profondeur** (HTML5 + Python + contrainte SQL `UNIQUE`)
- Concept : **pattern PRG** (Post/Redirect/Get) pour éviter les doublons au rafraîchissement
- Appel **asynchrone** vers Windows via `threading.Thread`
- **Emplacement schéma** : architecture en couches du code Flask *(à insérer)*

#### 7.3 Dashboard d'administration (2 pages)
- Layout commun via héritage de templates Jinja2
- Présentation des 4 pages : Accueil, Badges, Historique, Statistiques
- Captures d'écran à intégrer
- **Emplacement screenshot** : page de connexion *(à insérer)*
- **Emplacement screenshot** : tableau de bord *(à insérer)*
- **Emplacement screenshot** : gestion des badges *(à insérer)*
- **Emplacement screenshot** : page statistiques avec graphiques *(à insérer)*

#### 7.4 Listener PowerShell et intégration Windows Update (2 pages)
- Rôle : serveur HTTP minimal sur port 8080
- Module **PSWindowsUpdate** pour interroger Windows Update
- **Boîte de dialogue interactive Oui/Non** via `System.Windows.Forms.MessageBox`
- Exécution **asynchrone** via `Start-Job` pour ne pas bloquer le listener
- Réponse OK immédiate au Pi avant traitement (évite les timeouts en cascade)
- Note importante : ce listener démontre la même mécanique (déclenchement distant d'une action système) que l'agent de migration initial, mais sur un cas d'usage compatible avec les droits standards
- **Emplacement screenshot** : boîte de dialogue Windows Update *(à insérer)*

### 8. Configuration réseau et déploiement (2 pages)
- Profil réseau Windows en "Privé"
- Règles de pare-feu Windows : ICMP entrant, TCP 8080
- Démarrage automatique :
  - Sur le Pi : service **systemd** (`rfid-dashboard.service`)
  - Sur Windows : **Planificateur de tâches**
- Ordre de démarrage à respecter

### 9. Tests et validation (2 pages)

#### 9.1 Stratégie de test par couches
- Test 1 : connectivité réseau (ping bidirectionnel)
- Test 2 : API Flask seule (curl vers `/api/health` et `/api/badge`)
- Test 3 : listener Windows seul (curl du Pi vers `/trigger`)
- Test 4 : chaîne complète simulée
- Test 5 : test physique avec badge réel

#### 9.2 Tableau des erreurs rencontrées

| Symptôme | Diagnostic | Résolution |
|---|---|---|
| ESP32 affiche `Erreur HTTP -11` uniquement pour les badges autorisés | Flask bloque 5s en attendant la réponse Windows → ESP32 timeout | Appel Windows déplacé dans un `threading.Thread` |
| Listener PowerShell refuse de démarrer (préfixe en conflit) | Ancien listener tient déjà le port 8080 | Identifier le PID via `Get-WmiObject` puis `Stop-Process` |
| Service Flask échoue au démarrage (`View function overwriting`) | Deux routes `dashboard` définies dans `server.py` | Suppression du stub temporaire |
| Erreur de syntaxe Python `config.py` ligne 1 | Caractère parasite en début de fichier (artefact de copier-coller) | Suppression du caractère |

### 10. Améliorations envisagées (2 pages)

Reprendre la perspective de **réintégration progressive** des briques initiales :

- **Court terme** : authentification API entre ESP32 et Pi (token partagé), HTTPS auto-signé, export CSV de l'historique, multi-utilisateurs avec rôles
- **Moyen terme** : ajout du second lecteur QR Code, migration sur MariaDB en environnement maîtrisé, listener élargi à d'autres actions Windows
- **Long terme (vers le scope initial)** : intégration du polling par agent PowerShell, jonction AD automatique, déploiement progressif sur les postes CESE en environnement de pré-production

### 11. Conclusion (1 page)
- Bilan technique : ce qui marche, ce qui a été appris, ce qui reste
- **Bilan personnel honnête** : la confrontation au terrain et l'adaptation comme apprentissage central
- Lien avec les compétences du référentiel BTS CIEL

### Annexes (3-4 pages)
- Annexe A : extraits de code commentés
- Annexe B : référentiel des routes Flask
- Annexe C : commandes utiles de maintenance
- Annexe D : glossaire (RFID, MIFARE, REST, CRUD, PRG, PBKDF2, MQTT, AD, GPO, etc.)
- Annexe E : copie de la fiche projet CESE initiale (en référence)

---

## Convention pour les schémas et figures

À chaque emplacement de schéma, créer un encadré stylisé contenant :
- Fond gris clair (RGB 240,240,240)
- Titre `[Figure X — Titre]`
- Mention `À insérer par l'étudiant : description précise du schéma attendu`
- Numérotation continue dans tout le rapport

Chaque figure doit avoir une **légende complète** dessous, exemple :
> *Figure 3 — Architecture globale du système livré. Les trois machines communiquent via HTTP sur le réseau local 192.168.20.0/24.*

### Emplacements minimum à prévoir

1. Logo CESE / contexte visuel entreprise
2. Architecture **initiale envisagée** (avec QR + RFID + MQTT + MariaDB + AD)
3. Diagramme de cas d'utilisation (issu de la fiche SysML)
4. Architecture **finale livrée** (3 machines, HTTP, SQLite)
5. Diagramme de séquence UML (scan d'un badge dans la version livrée)
6. Modèle de données SQLite (3 tables)
7. Schéma de câblage ESP32 ↔ RC522 ou photo du montage
8. Architecture en couches du code Flask
9. Capture : page de connexion
10. Capture : tableau de bord
11. Capture : gestion des badges
12. Capture : page statistiques
13. Capture : boîte de dialogue Windows Update

L'étudiant doit pouvoir produire les figures 1 à 8 (avec draw.io, Lucidchart, dessin manuel scanné) et capturer les figures 9 à 13 directement depuis son système.

---

## Mise en forme du .docx

Suivre les conventions du skill `docx` (`/mnt/skills/public/docx/SKILL.md`).

### Typographie
- Police corps de texte : **Calibri 11pt** ou **Garamond 11pt**
- Interligne 1,15
- Marges 2,5 cm
- Titres en bleu foncé ou noir
- Justification du corps de texte

### Page de garde
- Saut de page après
- Pas de numéro de page sur la garde

### Sommaire
- Champ TOC à mettre à jour à l'ouverture (Word le propose automatiquement)
- Table des figures séparée juste après le sommaire

### En-tête et pied de page
- En-tête : titre court à gauche
- Pied : numéro de page à droite, mention "Rapport E6 — Thomas Caron — CESE" à gauche

### Encadrés figures
- Tableau Word à 1 cellule
- Fond gris clair, bordure fine
- Centré

### Blocs de code
- Police Consolas 10pt
- Fond gris très clair
- Encadré fin
- Limiter à 15-20 lignes par bloc

### Tableaux
- Style "Tableau Grille clair" ou équivalent
- Lignes alternées si possible

---

## Fichiers source à analyser

Avant de rédiger, **Claude Code doit explorer le dépôt** et lire les fichiers pour citer les vraies lignes (pas inventer).

Fichiers attendus :
- `server.py` — serveur Flask
- `database.py` — couche d'accès SQLite
- `auth.py` — authentification
- `config.py` — configuration
- `listener.ps1` — listener PowerShell avec Windows Update
- `esp32_rfid.ino` (ou similaire) — code embarqué
- `templates/*.html` — templates Jinja2
- `static/style.css` — feuille de style
- `mode_emploi_rfid.md` — mode d'emploi (peut servir de base pour certaines sections)
- `Porcédure_PowerShell_ESP32.pdf` — procédure technique de la **v1** (système RFID antérieur, sans dashboard, avec PostgreSQL et Cisco Packet Tracer) — utile pour montrer l'évolution technique de l'étudiant
- `01-Fiche_Modernisation_et_Administration_du_Parc_Informatique_du_CESE.odt` — **fiche projet officielle du CESE** (référence absolue du scope initial)

Si certains fichiers manquent, **lister explicitement ce qui manque** en tête de rapport et demander à l'étudiant.

---

## Méthode de travail recommandée pour Claude Code

1. **Étape 1 — Inventaire** : explorer la racine, lister tous les fichiers, signaler les manques
2. **Étape 2 — Lecture de la fiche CESE** : pour bien comprendre le scope initial
3. **Étape 3 — Lecture des sources livrées** : Python, PowerShell, Arduino, templates
4. **Étape 4 — Entretien avec l'étudiant** : poser les questions de la section "À demander à l'étudiant" pour combler les zones grises (notamment les difficultés rencontrées au CESE)
5. **Étape 5 — Plan détaillé** : soumettre à l'étudiant pour validation avant rédaction complète
6. **Étape 6 — Rédaction itérative** : section par section, avec proposition pour ajustement
7. **Étape 7 — Génération du .docx final**
8. **Étape 8 — Récapitulatif final** :
   - Liste des figures à produire et insérer
   - Liste des captures à prendre
   - Informations manquantes à compléter
   - Passages à vérifier factuellement

---

## À demander explicitement à l'étudiant avant ou pendant la rédaction

**Indispensables pour ne pas inventer** :

- [ ] **Nature exacte des difficultés rencontrées au CESE** (pourquoi MQTT/MariaDB/AD n'ont pas pu être déployés). Sans cette info, la section 4 sera creuse.
- [ ] **Dates clés du projet** : début, jalons, fin (le projet a duré quelques semaines, mais lesquelles ?)
- [ ] **Année scolaire et nom de l'établissement de formation** (le lycée qui présente le candidat)
- [ ] **Présence d'un tuteur école et d'un tuteur entreprise** (Matthieu Mainviel est le contact CESE, mais y a-t-il un tuteur de stage formel ?)
- [ ] **Captures d'écran du dashboard** (les 4 pages : login, accueil, badges, stats)
- [ ] **Capture de la boîte de dialogue Windows Update**
- [ ] **Photo du montage matériel ou schéma de câblage**
- [ ] **Schémas SysML** mentionnés dans la fiche initiale (cas d'utilisation, séquence) — l'étudiant les a-t-il produits ? Sinon, à recréer avec draw.io
- [ ] **Schéma architecture initiale CESE** (boîtier QR+RFID + MQTT + MariaDB + AD) à reproduire pour la section 3
- [ ] **Schéma architecture finale livrée** pour la section 5
- [ ] **Logo CESE** : autorisation d'utilisation pour la page de garde
- [ ] **Budget matériel approximatif** : prix de chaque composant (ESP32, RC522, badges, Pi)

**Souhaitables (pour monter le niveau du rapport)** :

- [ ] **Un planning Gantt** (même reconstitué après coup) — montre la gestion du temps
- [ ] **Une matrice de traçabilité** besoins initiaux ↔ solutions livrées (identifie clairement ce qui a été couvert et ce qui ne l'a pas été)
- [ ] **Un retour réflexif personnel** sur ce que le projet lui a appris
- [ ] **Le mapping avec les compétences du référentiel BTS CIEL IR** (à voir avec le tuteur école)
- [ ] **Une analyse fonctionnelle ou diagramme bête à cornes** pour formaliser le besoin

---

## Ton et registre

- **Sobre, technique, sans superlatif** (pas de "excellent", "innovant", "révolutionnaire")
- **Honnête sur l'évolution du scope** : ne jamais prétendre que le projet final était le scope initial. Le rapport assume la trajectoire et la justifie.
- **Précis** : "moins de 50 ms" plutôt que "rapide"
- **Première personne du singulier** ("j'ai choisi", "j'ai implémenté", "j'ai constaté que...")
- **Recul critique** : l'étudiant montre qu'il comprend les limites de ce qu'il a livré et qu'il sait positionner son travail dans une vision plus large

Ce ton est ce qui distingue un rapport BTS de bonne facture d'un rapport scolaire : l'honnêteté professionnelle face au réel.

---

## Note finale à Claude Code

Le risque le plus grand de ce rapport est de **mal narrer le pivot entre l'ambition CESE et la livraison effective**.

Deux pièges à éviter absolument :

1. **Le triomphalisme** : prétendre que tout s'est passé comme prévu, ce qui ne tromperait personne dans le jury.
2. **L'apologétique** : passer son temps à s'excuser de ne pas avoir tout livré, ce qui ferait passer l'étudiant pour défaitiste.

La voie correcte est **l'assomption professionnelle** : "Voici ce que le CESE a demandé. Voici ce que j'ai rencontré sur le terrain. Voici comment j'ai recentré le projet pour livrer quelque chose qui a du sens dans le temps imparti et avec les ressources disponibles. Voici ce que j'ai appris. Voici ce que je ferais différemment ou en plus si j'avais une phase 2."

C'est exactement ce qu'on attend d'un technicien supérieur en début de carrière : la lucidité face aux contraintes et la capacité à livrer malgré tout.