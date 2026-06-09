/*
 * Générateur du rapport E6 BTS CIEL — Thomas Caron / CESE
 *
 * Produit Rapport_E6_RFID_Caron.docx (~30 pages, A4, Calibri 11pt, 1,15 interligne)
 *
 * Lancement :   node generate_rapport.js
 */

const path = require("path");
const fs = require("fs");

// Permet de require('docx') même installé globalement
const globalRoot = require("child_process").execSync("npm root -g").toString().trim();
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, PageOrientation, LevelFormat,
    TabStopType, TabStopPosition, BorderStyle, WidthType, ShadingType,
    VerticalAlign, PageNumber, PageBreak, HeadingLevel, TableOfContents,
    PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
    convertInchesToTwip,
} = require(path.join(globalRoot, "docx"));

// =====================================================================
// CONSTANTES DE MISE EN PAGE (A4 avec marges 2,5 cm)
// =====================================================================
const PAGE_WIDTH  = 11906;          // A4 largeur en DXA
const PAGE_HEIGHT = 16838;          // A4 hauteur en DXA
const MARGIN      = 1418;           // 2,5 cm en DXA
const CONTENT_W   = PAGE_WIDTH - 2 * MARGIN;     // = 9070 DXA

const COLOR_TITLE     = "1F3864";   // bleu foncé sobre
const COLOR_SUBTITLE  = "2E75B6";   // bleu moyen
const COLOR_FIG_BG    = "F0F0F0";   // gris clair pour encadrés figures
const COLOR_CODE_BG   = "F7F7F7";   // gris très clair pour code
const COLOR_CODE_BORD = "D0D0D0";
const COLOR_TBL_HEAD  = "DCE6F1";   // bleu très pâle pour en-tête tableau
const COLOR_TBL_BORD  = "BFBFBF";

// =====================================================================
// HELPERS DE CONSTRUCTION DES BLOCS
// =====================================================================
function run(text, opts = {}) {
    return new TextRun({
        text,
        font: opts.font || "Calibri",
        size: opts.size || 22,         // 11pt = 22 half-points
        bold: !!opts.bold,
        italics: !!opts.italics,
        color: opts.color,
    });
}

function p(text, opts = {}) {
    return new Paragraph({
        spacing: { line: 276, after: 100 }, // 1,15 interligne
        alignment: opts.align || AlignmentType.JUSTIFIED,
        children: [run(text, opts)],
    });
}

function pMulti(runs, opts = {}) {
    return new Paragraph({
        spacing: { line: 276, after: 100 },
        alignment: opts.align || AlignmentType.JUSTIFIED,
        children: runs,
    });
}

function h1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 240, after: 180 },
        children: [new TextRun({ text, font: "Calibri", size: 36, bold: true, color: COLOR_TITLE })],
    });
}

function h1NoBreak(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 180 },
        children: [new TextRun({ text, font: "Calibri", size: 36, bold: true, color: COLOR_TITLE })],
    });
}

function h2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
        children: [new TextRun({ text, font: "Calibri", size: 28, bold: true, color: COLOR_TITLE })],
    });
}

function h3(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text, font: "Calibri", size: 24, bold: true, color: COLOR_SUBTITLE })],
    });
}

function bullet(text) {
    return new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { line: 276, after: 60 },
        alignment: AlignmentType.JUSTIFIED,
        children: [run(text)],
    });
}

function bulletRich(runs) {
    return new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { line: 276, after: 60 },
        alignment: AlignmentType.JUSTIFIED,
        children: runs,
    });
}

function spacer() {
    return new Paragraph({ children: [new TextRun("")] });
}

// Encadré figure (1 cellule, fond gris, bordure fine, centré)
function figureBox(num, titre, description, legende) {
    const inner = [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 40 },
            children: [new TextRun({ text: `[Figure ${num} — ${titre}]`, font: "Calibri", size: 22, bold: true, color: "595959" })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: `À insérer par l'étudiant : ${description}`, font: "Calibri", size: 20, italics: true, color: "808080" })],
        }),
    ];
    const cell = new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { fill: COLOR_FIG_BG, type: ShadingType.CLEAR },
        margins: { top: 200, bottom: 200, left: 200, right: 200 },
        borders: allBorders("A0A0A0"),
        children: inner,
    });
    const tbl = new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [CONTENT_W],
        rows: [new TableRow({ children: [cell] })],
    });
    const legendePar = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 200 },
        children: [new TextRun({ text: `Figure ${num} — ${legende}`, font: "Calibri", size: 20, italics: true, color: "595959" })],
    });
    return [tbl, legendePar];
}

// Bloc de code (1 cellule, fond gris très clair, Consolas 10pt)
function codeBlock(code) {
    const lines = code.split("\n");
    const paragraphs = lines.map(line => new Paragraph({
        spacing: { line: 240, after: 0 },
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: line || " ", font: "Consolas", size: 20 })],
    }));
    const cell = new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { fill: COLOR_CODE_BG, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        borders: allBorders(COLOR_CODE_BORD),
        children: paragraphs,
    });
    const tbl = new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [CONTENT_W],
        rows: [new TableRow({ children: [cell] })],
    });
    return [tbl, new Paragraph({ spacing: { after: 80 }, children: [new TextRun("")] })];
}

function allBorders(color) {
    const b = { style: BorderStyle.SINGLE, size: 4, color };
    return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
}

// Tableau (en-tête sur première ligne)
function table(headers, rows, colWidths) {
    // colWidths optionnel — sinon réparti
    const widths = colWidths || headers.map(() => Math.floor(CONTENT_W / headers.length));
    // ajustement arrondi pour atteindre CONTENT_W exact
    const sum = widths.reduce((a, b) => a + b, 0);
    widths[widths.length - 1] += (CONTENT_W - sum);

    const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            shading: { fill: COLOR_TBL_HEAD, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            borders: allBorders(COLOR_TBL_BORD),
            children: [new Paragraph({
                spacing: { after: 0 },
                children: [new TextRun({ text: h, font: "Calibri", size: 20, bold: true, color: COLOR_TITLE })],
            })],
        })),
    });
    const bodyRows = rows.map(r => new TableRow({
        children: r.map((cellText, i) => new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            borders: allBorders(COLOR_TBL_BORD),
            children: cellText.split("\n").map(line => new Paragraph({
                spacing: { after: 0 },
                children: [new TextRun({ text: line, font: "Calibri", size: 20 })],
            })),
        })),
    }));
    return [new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: widths,
        rows: [headerRow, ...bodyRows],
    }), new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] })];
}

// =====================================================================
// PAGE DE GARDE
// =====================================================================
function pageDeGarde() {
    return [
        new Paragraph({ spacing: { before: 1200 }, children: [new TextRun("")] }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "RAPPORT DE STAGE", font: "Calibri", size: 32, bold: true, color: COLOR_SUBTITLE })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ text: "Épreuve E6 — BTS CIEL option Informatique et Réseaux", font: "Calibri", size: 26, color: "404040" })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "Station d'authentification RFID", font: "Calibri", size: 48, bold: true, color: COLOR_TITLE })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ text: "pour la maintenance distante d'un parc Windows", font: "Calibri", size: 36, bold: true, color: COLOR_TITLE })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
            children: [new TextRun({ text: "Projet réalisé dans le cadre de la modernisation du parc informatique du CESE", font: "Calibri", size: 24, italics: true, color: "595959" })],
        }),
        new Paragraph({ spacing: { before: 800 }, children: [new TextRun("")] }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: "Thomas CARON", font: "Calibri", size: 32, bold: true })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ text: "Étudiant en BTS CIEL option Informatique et Réseaux", font: "Calibri", size: 22, italics: true, color: "595959" })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "Commanditaire : Conseil Économique, Social et Environnemental (CESE)", font: "Calibri", size: 22 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "9 place d'Iéna — 75016 Paris", font: "Calibri", size: 22 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ text: "Tuteur entreprise : Matthieu Mainviel", font: "Calibri", size: 22 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "Établissement de formation : [à compléter]", font: "Calibri", size: 22, italics: true, color: "808080" })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "Année scolaire : [à compléter]", font: "Calibri", size: 22, italics: true, color: "808080" })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
    ];
}

// =====================================================================
// SOMMAIRE (TOC automatique)
// =====================================================================
function sommaire() {
    return [
        h1NoBreak("Sommaire"),
        p("Le sommaire ci-dessous est généré automatiquement à partir des titres du document. Pour le mettre à jour dans Word : clic droit sur la table → \"Mettre à jour les champs\" → \"Mettre à jour toute la table\".", { italics: true, color: "595959" }),
        spacer(),
        new TableOfContents("Sommaire", {
            hyperlink: true,
            headingStyleRange: "1-3",
        }),
        new Paragraph({ children: [new PageBreak()] }),
    ];
}

// =====================================================================
// REMERCIEMENTS
// =====================================================================
function remerciements() {
    return [
        h1NoBreak("Remerciements"),
        p("Je tiens à remercier l'ensemble des personnes qui ont contribué, directement ou indirectement, à la réalisation de ce projet et de ce rapport."),
        p("Mes remerciements vont en premier lieu à Monsieur Matthieu Mainviel, mon interlocuteur au CESE, qui a porté le projet côté commanditaire, m'a transmis le cahier des charges initial et a maintenu un suivi régulier malgré le contexte de modernisation des serveurs de l'institution. Sa disponibilité m'a permis de comprendre les enjeux métier et les contraintes propres à un environnement institutionnel."),
        p("Je remercie également l'équipe pédagogique de mon établissement pour son accompagnement, en particulier mon tuteur école qui m'a aidé à structurer la démarche projet et à ajuster le périmètre lorsque les conditions de déploiement initiales ne pouvaient plus être réunies."),
        p("Enfin, mes remerciements vont à mes camarades de promotion pour leurs retours techniques, ainsi qu'à toutes les personnes ayant contribué à la production du matériel de test (ESP32, lecteur RC522, Raspberry Pi, badges MIFARE) qui a rendu possible la démonstration finale du prototype."),
        new Paragraph({ children: [new PageBreak()] }),
    ];
}

// =====================================================================
// SECTION 1 — INTRODUCTION
// =====================================================================
function section1Introduction() {
    return [
        h1("1. Introduction"),
        p("Ce rapport présente le projet que j'ai réalisé pour le compte du Conseil Économique, Social et Environnemental (CESE) dans le cadre de l'épreuve E6 du BTS CIEL option Informatique et Réseaux. Le commanditaire est une institution publique implantée 9 place d'Iéna à Paris, dont la mission constitutionnelle est de représenter la société civile organisée auprès des pouvoirs publics. Le projet a été suivi côté entreprise par Monsieur Matthieu Mainviel."),
        p("Le besoin exprimé initialement par le CESE était large : moderniser et automatiser une partie de l'administration du parc informatique interne, en s'appuyant sur un système combinant un boîtier d'authentification (lecture QR code et RFID), un serveur central sur Raspberry Pi, un middleware MQTT, une base de données MariaDB et un agent PowerShell de migration des postes Windows. Cet ensemble devait à terme accompagner le remplacement des postes obsolètes, la jonction des nouvelles machines au domaine Active Directory, la sauvegarde des profils utilisateurs et le déploiement des configurations de sécurité."),
        p("Au cours du projet, les conditions de déploiement initialement prévues n'ont pas pu être réunies, notamment en raison d'une campagne de renouvellement des serveurs internes du CESE qui rendait l'infrastructure cible mouvante pendant la durée du stage. J'ai donc, en accord avec le commanditaire, recentré le projet sur un sous-périmètre techniquement homogène, livrable dans le temps imparti, et démontrant les mêmes compétences en architecture client/serveur, communication réseau, base de données, développement embarqué et administration système."),
        p("Le livrable final est une station d'authentification RFID complète, composée d'un boîtier ESP32 équipé d'un lecteur RC522, d'un serveur Flask hébergé sur Raspberry Pi (avec base SQLite et dashboard web d'administration) et d'un listener PowerShell sur un poste Windows déclenchant à distance une vérification interactive des mises à jour Windows Update. Ce prototype constitue une brique fonctionnelle et démontrable du projet initial."),
        p("Le rapport est organisé comme suit. Après une présentation du commanditaire et du besoin métier (section 2), je rappelle fidèlement le cahier des charges initial tel que reçu (section 3). La section 4 — la plus stratégique — explique la confrontation au terrain et les décisions de recentrage prises. Les sections 5 à 8 décrivent l'architecture, la réalisation matérielle, la réalisation logicielle et le déploiement de la solution effectivement livrée. La section 9 présente la stratégie de tests et les erreurs rencontrées. La section 10 trace une perspective de phase 2 permettant, à terme, de réintégrer progressivement les briques initiales. La conclusion (section 11) propose un bilan technique et personnel."),
    ];
}

// =====================================================================
// SECTION 2 — CONTEXTE ENTREPRISE ET BESOIN CLIENT
// =====================================================================
function section2Contexte() {
    return [
        h1("2. Contexte de l'entreprise et besoin client"),
        h2("2.1 Présentation du CESE"),
        p("Le Conseil Économique, Social et Environnemental est la troisième assemblée constitutionnelle de la République française, aux côtés de l'Assemblée nationale et du Sénat. Implanté au Palais d'Iéna, 9 place d'Iéna dans le 16ᵉ arrondissement de Paris, il est composé de représentants des organisations professionnelles, syndicales et associatives. Sa mission est de conseiller le Gouvernement et le Parlement sur les politiques économiques, sociales et environnementales, à travers des avis, études et résolutions."),
        p("À ce titre, le CESE produit, manipule et conserve un volume important de documents de travail, d'archives institutionnelles et d'échanges avec des partenaires publics et privés. Son système d'information doit garantir à la fois la disponibilité des outils de production aux membres et aux services administratifs, et un niveau de sécurité compatible avec le statut de l'institution. Les postes utilisateurs combinent des stations de travail bureautiques, des postes itinérants pour les rapporteurs et un parc d'équipements de séance utilisés lors des plénières."),
        p("Le parc informatique adressé par ce projet est composé de stations Windows (Dell, HP, Lenovo) administrées dans un environnement Active Directory, avec des politiques de groupe (GPO) appliquant les standards de sécurité de l'institution."),
        ...figureBox(1, "Contexte CESE", "logo officiel du CESE et/ou photographie du Palais d'Iéna autorisée à des fins illustratives. Préciser dans la légende l'autorisation d'utilisation.", "Logo et site du Conseil Économique, Social et Environnemental, commanditaire du projet."),

        h2("2.2 Acteurs IT identifiés"),
        p("Le suivi opérationnel du projet a été assuré par Monsieur Matthieu Mainviel, mon interlocuteur unique côté CESE. Au-delà de ce contact projet, deux acteurs structurants conditionnent l'environnement de travail :"),
        bullet("La Direction des Systèmes d'Information (DSI), qui valide tout changement touchant à la production : ajout d'un service réseau, ouverture d'un port, création d'un objet AD, déploiement d'un agent sur un poste utilisateur."),
        bullet("L'équipe d'exploitation, en charge des serveurs, des sauvegardes, du parc de postes de travail et des interventions de maintenance courante."),
        p("Cette organisation, classique dans les institutions publiques, implique que toute initiative externe — y compris un projet étudiant — doit s'inscrire dans un cadre de validation explicite et ne peut pas, par construction, disposer des mêmes droits qu'un administrateur interne. Ce point sera développé en section 4."),

        h2("2.3 Problématique métier"),
        p("La modernisation du parc informatique répond à plusieurs préoccupations cumulées :"),
        bullet("Vieillissement des postes : un certain nombre de stations atteignent la fin de leur cycle de support, soit côté matériel, soit côté système d'exploitation (Windows 10 voit son support standard se terminer)."),
        bullet("Renforcement de la sécurité : la pression réglementaire (RGPD, directives ANSSI pour les administrations) impose un haut niveau d'exigence sur le chiffrement, l'authentification, la traçabilité et la maîtrise des configurations."),
        bullet("Productivité : la standardisation des logiciels métier, l'automatisation des opérations de migration et la réduction du temps d'intervention sur les postes sont des leviers directs d'efficacité pour l'équipe IT."),
        bullet("Traçabilité : pouvoir auditer qui a fait quoi sur quel poste à quel moment est devenu un attendu structurel, notamment dans le contexte institutionnel."),
        p("Le projet initial visait à apporter une réponse coordonnée à ces enjeux à travers une chaîne automatisée : un agent identifie la machine et son utilisateur via un badge, transmet l'information à un serveur central, qui déclenche les opérations de migration appropriées tout en tenant un journal complet."),

        h2("2.4 Contraintes propres à une institution publique"),
        p("Plusieurs contraintes structurelles, présentes dès la phase de cadrage, ont pesé sur les choix techniques et sur la trajectoire du projet :"),
        bullet("Périmètre de sécurité élevé : les actions sensibles (jonction au domaine, application de GPO, sauvegarde de profils, installation silencieuse de logiciels) nécessitent des droits élevés et un cadre de validation strict."),
        bullet("Conformité et traçabilité : toute manipulation des données utilisateurs doit être journalisée et auditable."),
        bullet("Gestion stricte des accès : un intervenant externe — et a fortiori un étudiant — ne peut pas, par défaut, disposer des droits d'administration sur un objet du domaine, ni installer un service sur un serveur de production."),
        bullet("Cycle de validation interne : l'ouverture d'un port, le déploiement d'un agent ou l'utilisation d'un nouvel équipement réseau passent par des étapes formelles dont les délais ne sont pas compressibles à l'échelle d'un projet étudiant."),
        p("Ces contraintes ne sont pas un obstacle au projet : elles sont au contraire le cœur du métier d'un futur technicien CIEL. Comprendre leurs implications, savoir s'y adapter, et proposer une trajectoire technique réaliste dans ce cadre fait partie des compétences attendues à l'examen."),
    ];
}

// =====================================================================
// SECTION 3 — CAHIER DES CHARGES INITIAL
// =====================================================================
function section3CahierCharges() {
    return [
        h1("3. Cahier des charges initial — version CESE"),
        p("Cette section présente le projet tel qu'il a été demandé à l'origine par le CESE, sans réduction préalable. Elle constitue la référence par rapport à laquelle la section 4 expliquera les pivots décidés."),

        h2("3.1 Besoins fonctionnels"),
        p("Le cahier des charges initial, formalisé par Matthieu Mainviel, couvrait un cycle complet de modernisation des postes utilisateurs :"),
        bullet("Remplacement progressif des stations Dell, HP et Lenovo arrivées en fin de cycle."),
        bullet("Déploiement d'une image Windows 10 puis Windows 11 standardisée, conforme aux exigences de l'institution."),
        bullet("Installation silencieuse, sur chaque nouvelle station, des logiciels institutionnels (bureautique, navigateurs, outils métier)."),
        bullet("Configuration automatique des paramètres de sécurité : antivirus, pare-feu, GPO de durcissement."),
        bullet("Migration des données utilisateurs depuis l'ancien poste : Documents, Bureau, Favoris du navigateur, en garantissant l'absence de perte."),
        bullet("Jonction automatique de la nouvelle station au domaine Active Directory du CESE."),
        bullet("Gestion des arrivants : provisionnement standard d'un nouvel utilisateur de l'institution."),
        bullet("Suivi et support : remontée d'incidents et journalisation centralisée des interventions."),

        h2("3.2 Besoins techniques"),
        p("Les exigences non fonctionnelles encadraient strictement la solution :"),
        bullet("Continuité de service : aucune interruption visible pour l'utilisateur final pendant les opérations de migration."),
        bullet("Respect des règles de sécurité internes : pas d'exposition de service non maîtrisé sur le réseau de production."),
        bullet("Documentation systématique de chaque intervention, exportable à des fins d'audit."),
        bullet("Aucune perte de données utilisateur, avec mécanisme de vérification post-migration."),
        bullet("Réversibilité : possibilité de revenir à l'état précédent en cas d'échec d'une étape."),

        h2("3.3 Architecture initialement envisagée"),
        p("L'architecture cible reposait sur trois composants principaux articulés autour d'un middleware temps réel :"),
        h3("3.3.1 Boîtier IoT à deux lecteurs"),
        p("Un boîtier matériel embarquant un microcontrôleur ESP32 et deux lecteurs distincts :"),
        bullet("Un lecteur de QR code pour identifier la machine (étiquette d'inventaire imprimée sur le poste)."),
        bullet("Un lecteur RFID pour identifier l'opérateur ou l'utilisateur autorisé."),
        p("Le boîtier devait lire les deux identifiants de manière simultanée et les transmettre via Wi-Fi sécurisé (WPA2) au serveur central, avec reconnexion automatique en cas de coupure et signalisation par LEDs (attente / validation / erreur)."),

        h3("3.3.2 Serveur central sur Raspberry Pi"),
        p("Une carte Raspberry Pi configurée comme nœud central, hébergeant :"),
        bullet("Un broker MQTT (Mosquitto) pour recevoir en temps réel les événements émis par le boîtier IoT et orchestrer les messages vers les agents Windows."),
        bullet("Un serveur web Flask exposant une API REST de consultation et de pilotage."),
        bullet("Une base de données MariaDB hébergeant l'inventaire des postes, des utilisateurs et le journal des migrations."),
        bullet("Un pare-feu UFW configuré pour n'ouvrir que les ports nécessaires."),
        bullet("Des certificats SSL pour exposer les interfaces sensibles en HTTPS."),

        h3("3.3.3 Agent PowerShell de migration"),
        p("Un service Windows installé sur chaque poste cible, en charge de :"),
        bullet("Interroger périodiquement le serveur central avec un jeton d'authentification (polling sécurisé)."),
        bullet("Sauvegarder les profils utilisateurs (Documents, Bureau, Favoris) vers un dépôt centralisé."),
        bullet("Installer silencieusement les logiciels métier."),
        bullet("Configurer les navigateurs avec les paramètres institutionnels."),
        bullet("Joindre automatiquement la nouvelle machine au domaine Active Directory."),
        bullet("Appliquer les GPO de sécurité après jonction."),
        bullet("Remonter l'état d'avancement de chaque étape au serveur en temps réel (POST JSON)."),
        ...figureBox(2, "Architecture initiale envisagée", "schéma système représentant le boîtier IoT (QR + RFID) communiquant en MQTT/HTTPS avec le Raspberry Pi (Mosquitto + Flask + MariaDB), lui-même orchestrant l'agent PowerShell sur les postes Windows joints au domaine AD. À produire avec draw.io ou équivalent.", "Architecture cible du projet de modernisation telle qu'envisagée dans le cahier des charges initial du CESE."),

        h2("3.4 Diagrammes SysML attendus"),
        p("Le cahier des charges mentionne plusieurs diagrammes SysML pour spécifier le système : diagramme de cas d'utilisation, diagramme de séquence pour la phase de migration, diagramme de blocs internes pour le boîtier IoT. Ces diagrammes étaient prévus pour formaliser la frontière du système et les interactions avec son environnement."),
        ...figureBox(3, "Diagramme de cas d'utilisation", "diagramme SysML 'use case' identifiant les acteurs (technicien IT, utilisateur, système AD, base d'inventaire) et leurs interactions avec le système d'authentification et de migration. À produire avec draw.io ou Modelio.", "Diagramme de cas d'utilisation associé au scope initial."),
    ];
}

// =====================================================================
// SECTION 4 — CONFRONTATION AU TERRAIN ET RECENTRAGE
// =====================================================================
function section4Recentrage() {
    return [
        h1("4. Confrontation au terrain et recentrage du projet"),
        p("Cette section est le cœur réflexif du rapport. Elle explique de manière transparente les difficultés concrètes rencontrées au cours du projet, les arbitrages techniques qui en ont découlé, et en quoi le périmètre finalement livré reste un livrable cohérent qui démontre les compétences attendues."),

        h2("4.1 Difficultés rencontrées"),
        p("Trois familles de difficultés, parfois imbriquées, ont fait évoluer le périmètre du projet."),

        h3("4.1.1 Renouvellement de l'infrastructure serveurs du CESE"),
        p("La principale difficulté, exprimée dès les premières réunions, est conjoncturelle : pendant la période où mon projet devait être réalisé, le CESE conduisait une campagne de renouvellement de ses serveurs internes. Les nouvelles machines arrivaient progressivement et leurs configurations cibles n'étaient pas figées à mon arrivée. Concrètement, cela signifie que l'infrastructure sur laquelle je devais m'appuyer — pour héberger le broker MQTT, la base MariaDB et exposer l'API Flask — n'était pas stable pendant la durée de mon intervention. Les fenêtres de disponibilité étaient courtes et soumises à arbitrage avec les opérations de migration internes pilotées par la DSI."),
        p("Cette situation a deux conséquences immédiates pour un projet étudiant de 1 à 2 mois :"),
        bullet("Il n'était plus raisonnable de viser un déploiement sur les serveurs cibles, ceux-ci étant eux-mêmes en cours de bascule."),
        bullet("Il n'était pas pertinent de figer une architecture middleware (MQTT + MariaDB) sur des machines dont la configuration définitive serait connue après la fin de mon projet."),

        h3("4.1.2 Périmètre de droits non extensible à un projet externe"),
        p("Indépendamment du calendrier serveurs, plusieurs actions prévues au cahier des charges initial requièrent des droits qui ne peuvent pas, par construction, être délégués à un intervenant externe pour un projet ponctuel :"),
        bullet("La jonction automatique d'une machine au domaine Active Directory nécessite un compte de service disposant des droits de création d'objet ordinateur dans une OU précise. L'octroi de tels droits à un projet étudiant est incompatible avec la politique d'habilitation d'une institution publique."),
        bullet("L'application de GPO de sécurité depuis un agent suppose une intégration AD assumée, donc un objet ordinateur joint au domaine — ce qui présuppose le point précédent."),
        bullet("La sauvegarde des profils utilisateurs vers un dépôt centralisé soulève des questions de conformité (où sont stockées les données ? qui peut y accéder ? combien de temps ?) que la DSI doit valider en amont."),
        p("Ces points ne sont pas des refus arbitraires : ils sont la traduction normale du cadre de sécurité d'une institution. Un futur technicien CIEL doit en comprendre la rationalité plutôt que de chercher à les contourner."),

        h3("4.1.3 Calendrier projet étudiant"),
        p("Un projet de 1 à 2 mois ne permet pas de mener à bien une migration de parc institutionnel, qui se chiffre en mois-équipe. Au-delà des contraintes techniques, le simple calendrier des validations internes (revue par la DSI, test sur un poste pilote, déploiement progressif, recette utilisateur) dépasse largement le temps imparti par l'épreuve. Le scope initial décrit en section 3 est, dans son intégralité, un scope d'équipe interne, pas un scope d'étudiant individuel."),

        h2("4.2 Décisions de recentrage prises"),
        p("Face à ces contraintes, j'ai pris, en accord avec Matthieu Mainviel et avec mon tuteur école, une série de décisions de recentrage. Chaque pivot a été motivé par la volonté de préserver les compétences techniques au cœur du référentiel IR tout en remplaçant les éléments dépendants du contexte CESE par des équivalents techniquement homogènes, déployables hors production."),
        ...table(
            ["Élément initial", "Décision finale", "Justification technique"],
            [
                ["Double lecture QR + RFID", "RFID seul (ESP32 + RC522)", "La double lecture imposait une caméra et un protocole de synchronisation des deux entrées. RFID seul démontre la même chaîne IoT → serveur → action et reste extensible."],
                ["Broker MQTT (Mosquitto)", "HTTP REST", "Le débit visé est de quelques scans par minute : pub/sub temps réel non requis. HTTP est plus simple, plus facilement déboguable et n'exige pas l'installation d'un service tiers sur des serveurs en cours de bascule."],
                ["Base MariaDB", "SQLite (fichier local)", "Aucun service SQL à administrer, aucun utilisateur SQL à créer. Volume très faible. Sauvegarde = copier un fichier. Adapté à un prototype hors production."],
                ["Agent complet de migration\n(sauvegarde + AD + GPO + logiciels)", "Listener PowerShell ciblé sur Windows Update interactif", "Les actions sensibles (jonction AD, GPO, sauvegarde) demandent des droits non délégués. Le listener Windows Update démontre exactement la même mécanique (déclenchement distant d'une action système) sur un cas d'usage compatible avec les droits standards."],
                ["Service Windows en polling avec jeton", "Listener HTTP push depuis le Pi", "Plus simple, sans polling périodique. Démontre les mêmes notions de communication machine-to-machine."],
                ["Tableau de bord interne complet", "Dashboard Flask : login admin, CRUD badges, historique filtré, statistiques graphiques", "Démontre le développement web full-stack et la dimension administration utilisateur, en local et hors production."],
            ],
            [2800, 2800, 3470],
        ),

        h2("4.3 Ce que démontre le projet final livré"),
        p("Le périmètre recentré couvre, sans réduction de difficulté technique, plusieurs compétences clés du référentiel IR du BTS CIEL :"),
        bullet("Architecture client/serveur multi-machines (ESP32 + Raspberry Pi + PC Windows) avec rôles bien séparés."),
        bullet("Communication par protocole standard (HTTP REST, JSON) entre des plateformes hétérogènes."),
        bullet("Base de données relationnelle avec opérations CRUD complètes (badges) et requêtes d'agrégation (statistiques)."),
        bullet("Sécurité applicative de base : hash de mot de passe (PBKDF2 via werkzeug.security), sessions Flask signées, validation côté serveur, requêtes SQL paramétrées contre l'injection."),
        bullet("Développement embarqué C++ sur ESP32 (lecture SPI du RC522, gestion Wi-Fi, requête HTTP)."),
        bullet("Scripting système et appel d'API Windows (PSWindowsUpdate, System.Windows.Forms, Start-Job)."),
        bullet("Administration système : services systemd côté Linux, planificateur de tâches côté Windows, configuration de pare-feu."),
        bullet("Tests par couches et diagnostic réseau (ping, curl, lecture de logs)."),
        p("La trajectoire suivie correspond à une situation professionnelle réelle : un cahier des charges large est confronté à des contraintes de terrain, et l'équipe technique livre un sous-périmètre maîtrisé qui peut être étendu par la suite. C'est précisément cette capacité à reformuler le besoin face à un blocage qui distingue un technicien supérieur d'un opérateur."),

        h2("4.4 Ce qui reste atteignable en phase 2"),
        p("La vision initiale n'est pas perdue. Elle est différée et structurée. Les briques suivantes peuvent être réintégrées progressivement, dans un environnement maîtrisé, une fois le renouvellement des serveurs CESE achevé :"),
        bullet("Migration de la persistance vers MariaDB sur un serveur de pré-production, en conservant la même couche d'accès (paramétrage du driver, schéma identique à quelques types près)."),
        bullet("Ajout du second lecteur (QR code) sur le boîtier ESP32 et fusion des deux flux d'identification."),
        bullet("Extension du listener pour déclencher d'autres actions de maintenance : inventaire WMI, déploiement d'un patch ciblé, application d'un script de configuration."),
        bullet("Mise en place d'une authentification API entre l'ESP32 et le Pi (jeton partagé, voire mutual TLS) lorsque l'enrôlement sur le réseau cible sera décidé."),
        bullet("Test en environnement de pré-production CESE avec droits étendus accordés temporairement par la DSI, ouvrant la voie à un pilote sur un nombre limité de postes."),
        p("Cette phase 2 transforme le prototype actuel en un système réellement opérationnel dans le contexte CESE, sans rejouer depuis zéro les choix architecturaux."),
    ];
}

// =====================================================================
// SECTION 5 — ARCHITECTURE TECHNIQUE DU PROJET LIVRÉ
// =====================================================================
function section5Architecture() {
    return [
        h1("5. Architecture technique du projet livré"),
        h2("5.1 Vue d'ensemble"),
        p("La solution livrée s'appuie sur trois machines distinctes communicant sur le même réseau local. Cette séparation matérielle reflète la séparation des rôles : capter l'identification, prendre la décision, exécuter l'action."),
        ...table(
            ["Machine", "Adresse IP", "Port", "Rôle"],
            [
                ["ESP32 + RC522", "192.168.20.0/24\n(client DHCP)", "—", "Lecture du badge RFID, encodage de l'UID, envoi HTTP POST au serveur."],
                ["Raspberry Pi (Flask)", "192.168.20.207", "5000 (TCP)", "Réception du scan, lookup en base SQLite, décision d'autorisation, déclenchement distant, journalisation, dashboard d'administration."],
                ["PC Windows (listener)", "192.168.20.205", "8080 (TCP)", "Réception de l'ordre de déclenchement, vérification interactive des mises à jour Windows Update, exécution asynchrone via Start-Job."],
            ],
            [2700, 2200, 1400, 2770],
        ),
        ...figureBox(4, "Architecture globale du système livré", "schéma simplifié des trois machines (ESP32 + RC522, Raspberry Pi avec Flask + SQLite, PC Windows avec listener PowerShell), les flèches HTTP/REST entre elles et les ports utilisés. Mettre en évidence le sous-réseau 192.168.20.0/24.", "Architecture globale du système livré. Les trois machines communiquent via HTTP sur le réseau local 192.168.20.0/24."),

        h2("5.2 Flux de données détaillé"),
        p("Le cycle complet d'un scan, depuis la présentation du badge jusqu'à l'affichage de la boîte de dialogue Windows Update sur le poste utilisateur, se déroule en huit étapes :"),
        bullet("1. L'opérateur approche son badge RFID du lecteur RC522 connecté à l'ESP32."),
        bullet("2. L'ESP32 lit l'UID via le bus SPI, le formate en chaîne hexadécimale séparée par des deux-points (ex : 5E:ED:DB:6F)."),
        bullet("3. L'ESP32 envoie un POST HTTP vers le Raspberry Pi : POST http://192.168.20.207:5000/api/badge avec le corps JSON {\"uid\":\"5E:ED:DB:6F\"}."),
        bullet("4. Le serveur Flask reçoit la requête, normalise l'UID (majuscules, strip) et interroge la table badges en base SQLite."),
        bullet("5. Si le badge existe et que sa colonne autorise vaut 1, Flask déclenche un thread séparé qui poste un JSON vers http://192.168.20.205:8080/trigger."),
        bullet("6. Flask enregistre immédiatement le passage dans la table passages (UID, nom, autorisé, déclenché, timestamp), puis renvoie une réponse JSON à l'ESP32."),
        bullet("7. Le listener PowerShell sur le PC Windows reçoit le trigger, répond OK immédiatement au Pi (pour éviter tout effet de timeout en cascade), puis lance en arrière-plan la vérification des mises à jour."),
        bullet("8. Une boîte de dialogue interactive s'affiche sur le bureau de l'utilisateur, listant les mises à jour disponibles et proposant Oui / Non pour l'installation."),
        ...figureBox(5, "Diagramme de séquence — scan d'un badge", "diagramme UML de séquence avec les trois acteurs verticaux (ESP32, Flask, listener PowerShell) et les flèches horizontales représentant les messages (POST /api/badge, lookup SQL, POST /trigger, réponse OK, MessageBox).", "Diagramme de séquence d'un scan complet, illustrant le découplage asynchrone entre la réponse au boîtier et l'exécution sur le poste Windows."),

        h2("5.3 Modèle de données SQLite"),
        p("Le serveur Flask s'appuie sur une base SQLite locale (fichier badges.db) initialisée au premier démarrage par la fonction init_db() de database.py. Trois tables structurent la donnée :"),
        bullet("badges : référentiel des UID connus du système (id, uid UNIQUE, nom, autorise, date_ajout, note)."),
        bullet("passages : journal des scans (id, timestamp, uid, nom au moment du scan, autorise, declenche). Cette table n'a pas de clé étrangère vers badges : un passage reste consultable même après suppression du badge associé, ce qui est essentiel pour préserver l'audit."),
        bullet("admins : comptes du dashboard (id, username UNIQUE, password_hash, date_creation). Le mot de passe n'est jamais stocké en clair, seulement son hash PBKDF2 généré par werkzeug.security."),
        p("Deux index accélèrent les requêtes d'historique : idx_passages_uid sur la colonne uid et idx_passages_ts sur le timestamp. La contrainte UNIQUE sur badges.uid garantit qu'un UID ne peut pas être enregistré deux fois — c'est une protection au niveau base, en complément de la validation Python et de l'attribut HTML pattern."),
        ...figureBox(6, "Modèle de données SQLite", "diagramme entité-association des trois tables badges, passages et admins, avec les types de colonnes, les contraintes (UNIQUE, NOT NULL, DEFAULT) et les index. Indiquer explicitement l'absence de clé étrangère entre passages.uid et badges.uid (choix volontaire pour préserver l'audit).", "Modèle de données de la base SQLite. La table passages conserve le nom au moment du scan, garantissant la traçabilité même après modification du référentiel badges."),
    ];
}

// =====================================================================
// SECTION 6 — RÉALISATION MATÉRIELLE
// =====================================================================
function section6Materiel() {
    return [
        h1("6. Réalisation matérielle"),
        h2("6.1 Liste du matériel"),
        ...table(
            ["Composant", "Modèle", "Rôle", "Prix indicatif"],
            [
                ["Microcontrôleur", "ESP32 DevKit V1 (38 broches)", "Lecture SPI du RC522, Wi-Fi, envoi HTTP", "≈ 8 €"],
                ["Lecteur RFID", "RC522 13,56 MHz (carte MIFARE)", "Lecture des badges MIFARE Classic 1K", "≈ 3 €"],
                ["Serveur central", "Raspberry Pi 4 Model B 4 Go", "Flask, SQLite, dashboard", "≈ 60 €"],
                ["Alimentation Pi", "USB-C 5V 3A officielle", "Alimentation stable du Pi 4", "≈ 10 €"],
                ["Carte microSD", "32 Go classe 10", "OS Raspberry Pi OS + base SQLite", "≈ 8 €"],
                ["PC Windows", "Poste standard du parc", "Listener PowerShell + Windows Update", "fourni"],
                ["Badges MIFARE", "Cartes MIFARE Classic 1K (lot de 10)", "Identifiants utilisateurs", "≈ 10 €"],
                ["Câblage", "Câbles Dupont F/F", "Liaisons RC522 ↔ ESP32", "≈ 3 €"],
            ],
            [2200, 2700, 2900, 1270],
        ),
        p("Le budget matériel total du prototype, hors PC Windows fourni, se situe autour de 100 €, soit un ordre de grandeur compatible avec un projet étudiant et avec une éventuelle multiplication des boîtiers en phase 2."),

        h2("6.2 Câblage RC522 ↔ ESP32"),
        p("Le RC522 communique avec l'ESP32 via le bus SPI. Les broches utilisées correspondent aux constantes définies en tête du firmware ESP32 (SS_PIN = 5, RST_PIN = 22) :"),
        ...table(
            ["Broche RC522", "Broche ESP32", "Rôle"],
            [
                ["VCC", "3.3V (jamais 5V)", "Alimentation du lecteur"],
                ["GND", "GND", "Masse commune"],
                ["RST", "GPIO 22", "Reset matériel (#define RST_PIN 22)"],
                ["IRQ", "non connecté", "Pas utilisé en mode polling"],
                ["MISO", "GPIO 19", "Données entrantes (master in / slave out)"],
                ["MOSI", "GPIO 23", "Données sortantes (master out / slave in)"],
                ["SCK", "GPIO 18", "Horloge SPI"],
                ["SS / SDA", "GPIO 5", "Chip select (#define SS_PIN 5)"],
            ],
            [2200, 2600, 4270],
        ),
        p("Point d'attention important : l'alimentation du RC522 doit impérativement être en 3,3 V. Une connexion accidentelle en 5 V endommage durablement le module et constitue l'erreur la plus fréquente en première installation."),
        ...figureBox(7, "Câblage ESP32 ↔ RC522", "photographie du montage réel (ESP32, RC522, badges MIFARE) ou schéma de câblage clair avec les huit liaisons listées dans le tableau ci-dessus. Mettre en évidence la connexion VCC sur 3.3V.", "Schéma de câblage entre l'ESP32 et le lecteur RC522. La masse est commune ; l'alimentation est exclusivement en 3,3 V."),
    ];
}

// =====================================================================
// SECTION 7 — RÉALISATION LOGICIELLE
// =====================================================================
function section7Logiciel() {
    return [
        h1("7. Réalisation logicielle"),
        h2("7.1 Code embarqué ESP32"),
        p("Le firmware ESP32 (fichier code_esp32/code_esp32.ino) est volontairement compact : moins de 80 lignes pour l'ensemble des fonctionnalités. Il s'appuie sur quatre bibliothèques standard : SPI (bus matériel), MFRC522 (pilote du lecteur), WiFi (gestion de la connexion sans fil) et HTTPClient (émission de requêtes HTTP)."),
        p("Trois constantes en tête de fichier centralisent la configuration de déploiement :"),
        ...codeBlock([
            "const char* WIFI_SSID = \"TP-Link_CIEL\";",
            "const char* WIFI_PASS = \"jbs2025*\";",
            "const char* RPI_URL   = \"http://192.168.20.207:5000/api/badge\";",
        ].join("\n")),
        p("Le SSID Wi-Fi pointe sur un point d'accès dédié au projet (réseau de test indépendant de la production CESE), conformément aux décisions de recentrage exposées en section 4."),
        p("La fonction connectWifi() encapsule la connexion et est rappelée dans la boucle principale si le lien venait à tomber, ce qui assure une reconnexion automatique sans redémarrage :"),
        ...codeBlock([
            "void loop() {",
            "    if (WiFi.status() != WL_CONNECTED) {",
            "        Serial.println(\"Wi-Fi perdu, reconnexion...\");",
            "        connectWifi();",
            "    }",
            "    if (!rfid.PICC_IsNewCardPresent()) return;",
            "    if (!rfid.PICC_ReadCardSerial())   return;",
            "    // ... lecture de l'UID, formatage hexa, POST HTTP",
            "}",
        ].join("\n")),
        p("Après lecture, l'UID est concaténé en chaîne hexadécimale séparée par des deux-points (format lisible par un humain, identique à celui stocké en base) puis converti en majuscules. Le corps de la requête est un objet JSON minimal { \"uid\": \"5E:ED:DB:6F\" } envoyé sur la route /api/badge du serveur Flask. En cas d'erreur HTTP, le code de retour est imprimé sur la console série pour le diagnostic."),

        h2("7.2 Serveur Flask sur Raspberry Pi"),
        p("Le serveur applicatif est écrit en Python 3 avec le micro-framework Flask 3.0.0. J'ai choisi Flask plutôt que Django pour deux raisons : la légèreté (un service local sur Raspberry Pi n'a pas besoin d'un ORM complet ni d'un admin auto-généré) et la transparence pédagogique (chaque route est explicite, ce qui facilite la défense du projet à l'oral)."),

        h3("7.2.1 Séparation des responsabilités"),
        p("Le code est découpé en quatre modules Python à responsabilités claires, plus un dossier de templates Jinja2 et un dossier static pour la CSS :"),
        bullet("config.py : constantes de configuration (chemin de la base, URL du listener Windows, port Flask, identifiants admin par défaut, clé secrète de session)."),
        bullet("database.py : couche d'accès SQLite. Toute la logique SQL est isolée ici ; le reste du code ne manipule jamais directement de chaîne SQL."),
        bullet("auth.py : authentification du dashboard, exposant le décorateur @login_required et les fonctions verifier_credentials / connecter_utilisateur / deconnecter_utilisateur."),
        bullet("server.py : application Flask, déclaration des routes API et des routes dashboard, orchestration des appels aux deux modules précédents."),
        bullet("templates/ : six fichiers Jinja2 (base.html, login.html, dashboard.html, badges.html, historique.html, stats.html)."),
        bullet("static/style.css : feuille de style unique partagée par toutes les pages."),
        ...figureBox(8, "Architecture en couches du code Flask", "schéma en couches avec, de bas en haut : SQLite (badges.db) → database.py → server.py + auth.py → templates Jinja2 → utilisateur navigateur. Sur le côté, montrer l'entrée venant de l'API /api/badge depuis l'ESP32 et la sortie vers le listener Windows.", "Architecture en couches du code Flask. La base SQLite n'est jamais accédée directement depuis les routes : tout passe par database.py."),

        h3("7.2.2 Routes API"),
        p("Deux routes constituent l'API exposée à l'ESP32 :"),
        bullet("POST /api/badge : reçoit l'UID, applique la logique de décision et journalise le passage. Renvoie un JSON avec status, uid, nom, autorise et declenche."),
        bullet("GET /api/health : endpoint trivial qui renvoie { \"status\": \"ok\", \"service\": \"rfid-dashboard\" }. Utile pour les tests de bout en bout et pour intégrer la station à une supervision."),
        p("La validation des entrées est systématique : si le JSON est absent ou si la clé uid manque, la route répond 400 avec un message explicite, plutôt que de lever une exception 500."),

        h3("7.2.3 Sécurité du dashboard"),
        p("Le dashboard d'administration n'est accessible qu'aux comptes admins authentifiés. La défense en profondeur repose sur cinq mécanismes complémentaires :"),
        bullet("Sessions Flask : à la connexion, l'identifiant et le nom d'utilisateur sont placés dans la session côté serveur. Le cookie envoyé au navigateur n'est qu'un identifiant signé par la SECRET_KEY de l'application — il ne contient pas le mot de passe."),
        bullet("Hash de mot de passe : les mots de passe ne sont jamais stockés en clair. La fonction generate_password_hash de werkzeug.security applique PBKDF2 avec un sel aléatoire, et check_password_hash effectue la vérification en temps constant."),
        bullet("Décorateur @login_required : appliqué à toutes les routes dashboard, il redirige vers /login si la session ne contient pas d'identifiant utilisateur, en conservant l'URL initialement demandée dans le paramètre next pour la redirection post-login."),
        bullet("Validation côté serveur : tous les champs de formulaire sont strip()-és, l'UID est validé par expression régulière ^[0-9A-Fa-f:]+$ pour empêcher l'injection d'autres caractères."),
        bullet("Requêtes SQL paramétrées : toutes les requêtes utilisent les placeholders ? de sqlite3, jamais de concaténation de chaîne. La protection contre l'injection SQL est garantie par le driver lui-même."),
        ...codeBlock([
            "def login_required(view_func):",
            "    @wraps(view_func)",
            "    def wrapper(*args, **kwargs):",
            "        if not utilisateur_connecte():",
            "            flash(\"Veuillez vous connecter pour accéder à cette page.\", \"warning\")",
            "            return redirect(url_for(\"login\", next=request.path))",
            "        return view_func(*args, **kwargs)",
            "    return wrapper",
        ].join("\n")),

        h3("7.2.4 Pattern PRG et appel asynchrone"),
        p("Toutes les routes de modification (ajout / suppression / activation d'un badge) appliquent le pattern PRG (Post → Redirect → Get) : après le traitement, la route renvoie un redirect, ce qui empêche la soumission accidentelle d'un formulaire en double si l'utilisateur rafraîchit la page."),
        p("Le déclenchement vers le PC Windows est crucial : il doit se faire sans bloquer la réponse à l'ESP32, car un boîtier qui attend 5 secondes serait peu réactif et déclencherait potentiellement un timeout. La fonction declencher_windows() lance un thread daemon qui exécute le POST en arrière-plan et renvoie immédiatement :"),
        ...codeBlock([
            "def declencher_windows(payload: dict) -> bool:",
            "    def _envoyer():",
            "        try:",
            "            resp = requests.post(WINDOWS_URL, json=payload, timeout=3)",
            "            ok = 200 <= resp.status_code < 300",
            "            print(f\"[WIN] Réponse {resp.status_code} — {'OK' if ok else 'KO'}\")",
            "        except requests.exceptions.Timeout:",
            "            print(\"[WIN] Timeout : PC Windows n'a pas répondu\")",
            "        except requests.exceptions.ConnectionError:",
            "            print(\"[WIN] Connexion refusée : listener éteint ou pare-feu ?\")",
            "    threading.Thread(target=_envoyer, daemon=True).start()",
            "    return True",
        ].join("\n")),
        p("Ce choix résout un bug observé en tests intermédiaires (cf. section 9.2) où l'ESP32 affichait systématiquement une erreur HTTP -11 pour les badges autorisés."),

        h3("7.2.5 Couche d'accès aux données"),
        p("Le module database.py expose un context manager get_conn() qui ouvre une connexion SQLite, active row_factory=sqlite3.Row (accès aux colonnes par nom), active PRAGMA foreign_keys=ON (désactivées par défaut en SQLite), commit en sortie normale et rollback en cas d'exception. Toutes les fonctions CRUD passent par lui :"),
        ...codeBlock([
            "@contextmanager",
            "def get_conn():",
            "    conn = sqlite3.connect(DB_PATH)",
            "    conn.row_factory = sqlite3.Row",
            "    conn.execute(\"PRAGMA foreign_keys = ON\")",
            "    try:",
            "        yield conn",
            "        conn.commit()",
            "    except Exception:",
            "        conn.rollback()",
            "        raise",
            "    finally:",
            "        conn.close()",
        ].join("\n")),
        p("Les statistiques exposées au dashboard sont calculées en SQL plutôt qu'en Python (COUNT, GROUP BY strftime, division pour le taux de refus avec protection contre la division par zéro). Ce choix garantit que le calcul reste rapide même avec plusieurs milliers de passages."),

        h2("7.3 Dashboard d'administration"),
        p("Le dashboard est un site web léger à quatre pages, accessible après login. La mise en page commune est portée par templates/base.html (barre de navigation, messages flash, pied de page) ; chaque page étend ce gabarit via {% extends \"base.html\" %} et remplit le bloc content."),

        h3("7.3.1 Page de connexion"),
        p("La page /login présente un formulaire simple (nom d'utilisateur, mot de passe) avec autofocus sur le premier champ et autocomplete approprié. En cas d'identifiants invalides, un message flash rouge indique l'échec sans révéler si c'est le login ou le mot de passe qui était incorrect (bonne pratique de sécurité)."),
        ...figureBox(9, "Page de connexion", "capture d'écran de la page /login après une tentative d'identifiant erroné (pour montrer le message flash). Format PNG, largeur cible 14 cm.", "Page de connexion du dashboard d'administration."),

        h3("7.3.2 Tableau de bord (accueil)"),
        p("La page / présente quatre indicateurs clés en haut (total scans, déclenchements, refus avec taux, badges enregistrés et nombre d'actifs), puis deux blocs en parallèle : les dix derniers passages et le top 5 des badges les plus actifs. Les passages sont colorés selon leur statut : vert pour déclenché, orange pour autorisé mais Windows non joignable, rouge pour refusé."),
        ...figureBox(10, "Tableau de bord", "capture d'écran de la page d'accueil avec des données réalistes (au moins 20 passages enregistrés et 5 badges actifs).", "Page d'accueil du dashboard. Quatre indicateurs clés en haut, derniers passages et top badges en dessous."),

        h3("7.3.3 Gestion des badges (CRUD)"),
        p("La page /badges expose la totalité du cycle de vie d'un badge :"),
        bullet("Création : un formulaire en haut de page demande l'UID, le nom et une note optionnelle. La validation se fait à trois niveaux : attribut HTML pattern=\"[0-9A-Fa-f:]+\", re.match en Python, contrainte UNIQUE en base."),
        bullet("Lecture : le tableau affiche tous les badges triés par date d'ajout décroissante."),
        bullet("Activation/désactivation : un seul bouton bascule l'état autorise du badge entre 0 et 1."),
        bullet("Suppression : un bouton dédié, accompagné d'un confirm() JavaScript, supprime définitivement le badge. L'historique des passages associés reste conservé (pas de cascade)."),
        ...figureBox(11, "Gestion des badges", "capture d'écran de la page /badges après ajout de plusieurs badges, avec un message flash de succès visible.", "Page de gestion des badges. Le formulaire d'ajout est en haut, suivi du tableau CRUD avec actions par ligne."),

        h3("7.3.4 Historique des passages"),
        p("La page /historique permet de filtrer les passages par sous-chaîne d'UID, par statut (tous / autorisés / refusés) et de paramétrer la limite (50, 100 ou 500 derniers). Les filtres sont passés en query string, ce qui rend les liens partageables et compatibles avec le bouton de rafraîchissement."),

        h3("7.3.5 Page statistiques"),
        p("La page /stats reprend les indicateurs clés en haut, puis affiche trois graphiques générés en JavaScript par la bibliothèque Chart.js 4 (chargée depuis CDN) :"),
        bullet("Un graphique à barres verticales : nombre de scans par heure de la journée (0h–23h)."),
        bullet("Un graphique à barres horizontales : nombre de scans par jour de la semaine, remappé sur lundi=0 ... dimanche=6."),
        bullet("Un graphique en courbe : évolution des scans sur les sept derniers jours."),
        p("Les données sont injectées depuis Flask via le filtre Jinja | tojson, qui prend en charge l'échappement et le formatage JSON. Aucune requête asynchrone n'est nécessaire pour rendre la page : tout est en un seul aller-retour HTTP."),
        ...figureBox(12, "Page statistiques", "capture d'écran de la page /stats avec les trois graphiques (barres heures, barres jours, courbe 7 jours) remplis de données.", "Page statistiques du dashboard. Les graphiques sont rendus côté navigateur par Chart.js à partir de données pré-calculées en SQL."),

        h2("7.4 Listener PowerShell et intégration Windows Update"),
        p("Le listener PowerShell tourne sur le PC Windows cible. Il joue un rôle équivalent à celui qu'aurait joué l'agent de migration décrit dans le cahier des charges initial, mais sur un cas d'usage compatible avec les droits standards d'un poste utilisateur : la vérification interactive des mises à jour Windows Update."),

        h3("7.4.1 Architecture du listener"),
        p("Le listener est un serveur HTTP minimal écouté sur le port 8080, implémenté à l'aide de la classe HttpListener du framework .NET (System.Net.HttpListener), instanciée depuis PowerShell. Il enregistre un préfixe http://+:8080/trigger/ et boucle indéfiniment sur l'acceptation des requêtes."),
        p("À chaque requête POST reçue sur /trigger, le listener :"),
        bullet("Désérialise le JSON pour récupérer le nom de l'utilisateur ayant scanné."),
        bullet("Répond immédiatement HTTP 200 OK au Raspberry Pi (libère le thread Flask)."),
        bullet("Démarre un Start-Job qui exécute en arrière-plan la vérification des mises à jour et l'affichage de la boîte de dialogue."),

        h3("7.4.2 Vérification des mises à jour"),
        p("La détection des mises à jour disponibles s'appuie sur le module PowerShell PSWindowsUpdate (à installer depuis PSGallery). La fonction Get-WindowsUpdate renvoie la liste des mises à jour applicables. Le listener construit une chaîne lisible à partir de cette liste puis l'utilise comme contenu d'une boîte de dialogue System.Windows.Forms.MessageBox avec les boutons Oui / Non :"),
        ...codeBlock([
            "$updates = Get-WindowsUpdate -ErrorAction SilentlyContinue",
            "if ($updates) {",
            "    $msg = \"$($updates.Count) mise(s) à jour disponible(s).`nInstaller maintenant ?\"",
            "    $res = [System.Windows.Forms.MessageBox]::Show(",
            "        $msg, 'Maintenance — Thomas Caron',",
            "        [System.Windows.Forms.MessageBoxButtons]::YesNo,",
            "        [System.Windows.Forms.MessageBoxIcon]::Question)",
            "    if ($res -eq 'Yes') {",
            "        Install-WindowsUpdate -AcceptAll -AutoReboot:$false",
            "    }",
            "}",
        ].join("\n")),

        h3("7.4.3 Réponse immédiate au Pi"),
        p("Le choix de répondre OK au Pi avant le traitement long est un compromis classique en programmation asynchrone : il évite qu'un timeout en cascade (boîtier → Pi → Windows) ne fasse échouer toute la chaîne. Le résultat réel du traitement est tracé dans le fichier journal local du listener, qui pourrait dans une phase 2 être renvoyé au Pi par une route /report dédiée."),
        ...figureBox(13, "Boîte de dialogue Windows Update", "capture d'écran de la boîte de dialogue Oui/Non affichée par le listener après un scan, avec le titre 'Maintenance — Thomas Caron' et la liste des mises à jour détectées.", "Boîte de dialogue interactive Windows Update déclenchée depuis le scan d'un badge."),

        h3("7.4.4 Mécanisme équivalent à l'agent de migration initial"),
        p("Sur le plan structurel, ce listener démontre exactement la même mécanique que l'agent PowerShell décrit en section 3 : un serveur central déclenche à distance une action système locale, via un protocole maîtrisé, sur un poste Windows identifié. Seul le contenu de l'action change — Windows Update au lieu de sauvegarde de profils et jonction AD. Les compétences techniques mobilisées (gestion d'un service réseau, appel à une API Windows, exécution asynchrone, journalisation) sont strictement les mêmes."),
    ];
}

// =====================================================================
// SECTION 8 — CONFIGURATION RÉSEAU ET DÉPLOIEMENT
// =====================================================================
function section8Reseau() {
    return [
        h1("8. Configuration réseau et déploiement"),
        h2("8.1 Profil réseau Windows"),
        p("Le PC Windows hébergeant le listener doit avoir son profil réseau configuré en \"Privé\" (et non \"Public\"). Le profil \"Public\" durcit les règles de pare-feu et bloque par défaut tout trafic entrant non explicitement autorisé, y compris le ping ICMP utilisé pour diagnostiquer la connectivité. Ce paramétrage se vérifie dans Paramètres → Réseau et Internet → Wi-Fi → propriétés du réseau actif."),

        h2("8.2 Règles de pare-feu Windows"),
        p("Deux règles entrantes sont ajoutées au pare-feu Windows pour permettre les communications de la station :"),
        bullet("ICMP echo request entrant : autorise le ping depuis le Raspberry Pi vers le PC Windows. Indispensable pour les premiers tests de connectivité."),
        bullet("TCP 8080 entrant : autorise les requêtes POST vers le listener. La règle est restreinte au sous-réseau 192.168.20.0/24 pour limiter l'exposition."),
        p("Ces règles peuvent être créées via la console graphique wf.msc ou par script PowerShell :"),
        ...codeBlock([
            "New-NetFirewallRule -DisplayName \"RFID-Listener-8080\" `",
            "    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 `",
            "    -RemoteAddress 192.168.20.0/24 -Profile Private",
            "",
            "New-NetFirewallRule -DisplayName \"RFID-Allow-Ping\" `",
            "    -Direction Inbound -Action Allow -Protocol ICMPv4 `",
            "    -IcmpType 8 -Profile Private",
        ].join("\n")),

        h2("8.3 Démarrage automatique côté Raspberry Pi (systemd)"),
        p("Le serveur Flask est lancé automatiquement par systemd via un service dédié rfid-dashboard.service. Ce mode de lancement présente plusieurs avantages par rapport à un simple python3 server.py lancé depuis un terminal : redémarrage automatique en cas de crash, logs centralisés via journalctl, démarrage au boot sans intervention manuelle."),
        ...codeBlock([
            "[Unit]",
            "Description=Dashboard RFID Flask",
            "After=network-online.target",
            "Wants=network-online.target",
            "",
            "[Service]",
            "Type=simple",
            "User=pi",
            "WorkingDirectory=/home/pi/rfid",
            "ExecStart=/usr/bin/python3 /home/pi/rfid/server.py",
            "Restart=on-failure",
            "RestartSec=5",
            "",
            "[Install]",
            "WantedBy=multi-user.target",
        ].join("\n")),
        p("Activation par sudo systemctl enable --now rfid-dashboard.service. Diagnostic en cas d'incident par sudo journalctl -u rfid-dashboard.service -n 50."),

        h2("8.4 Démarrage automatique côté Windows (Planificateur de tâches)"),
        p("Le listener PowerShell est lancé au démarrage de session par une tâche planifiée Windows. La tâche est configurée pour s'exécuter au démarrage avec les privilèges de l'utilisateur courant, sans fenêtre console visible (option -WindowStyle Hidden). Elle peut également être lancée manuellement via schtasks /run /tn \"RFID-Listener\"."),

        h2("8.5 Ordre de démarrage"),
        p("Le système peut être démarré dans n'importe quel ordre, mais l'ordre recommandé est : Raspberry Pi en premier (Flask en attente), puis listener Windows (en attente), puis ESP32 (qui n'émet de requêtes qu'à l'apparition d'un badge). Ce séquencement minimise les erreurs de connexion lors des premières requêtes."),
    ];
}

// =====================================================================
// SECTION 9 — TESTS ET VALIDATION
// =====================================================================
function section9Tests() {
    return [
        h1("9. Tests et validation"),
        h2("9.1 Stratégie de test par couches"),
        p("Plutôt que de tester directement le scénario complet (badge → Windows Update), j'ai validé le système par couches successives, du plus simple au plus complexe. Cette approche permet de localiser rapidement la source d'un dysfonctionnement."),
        ...table(
            ["Test", "Objectif", "Méthode"],
            [
                ["1. Connectivité réseau", "Les trois machines se voient.", "ping bidirectionnel ESP32 ↔ Pi, Pi ↔ Windows."],
                ["2. API Flask seule", "Flask répond correctement.", "curl http://192.168.20.207:5000/api/health depuis le Pi, puis curl POST sur /api/badge avec un UID de test."],
                ["3. Listener Windows seul", "Le listener est joignable.", "curl POST http://192.168.20.205:8080/trigger depuis le Pi avec un JSON minimal."],
                ["4. Chaîne complète simulée", "Flask déclenche Windows.", "POST sur /api/badge avec un UID autorisé en base ; observation des logs Pi et Windows."],
                ["5. Test physique", "Scan d'un vrai badge.", "Présentation d'un badge MIFARE devant le RC522 ; vérification de l'apparition de la boîte de dialogue."],
            ],
            [2200, 2700, 4170],
        ),
        p("À chaque couche, un échec localisé sur cette couche garantit que les couches précédentes sont opérationnelles, ce qui ramène l'investigation à un périmètre restreint."),

        h2("9.2 Erreurs rencontrées et résolutions"),
        p("Au cours du développement, plusieurs anomalies ont été rencontrées et corrigées. Les plus instructives sont consignées ci-dessous, car elles illustrent des mécanismes typiques d'un système réparti."),
        ...table(
            ["Symptôme", "Diagnostic", "Résolution"],
            [
                ["L'ESP32 affiche Erreur HTTP -11 uniquement pour les badges autorisés.", "Flask se bloque ≈ 5 s à attendre la réponse du listener Windows avant de répondre à l'ESP32. L'ESP32 timeoute pendant ce délai.", "Appel vers Windows déplacé dans un threading.Thread daemon. Flask répond immédiatement à l'ESP32 ; le déclenchement Windows continue en arrière-plan."],
                ["Le listener PowerShell refuse de démarrer (préfixe en conflit).", "Une instance précédente du listener détient encore le port 8080.", "Identification du PID via Get-WmiObject Win32_Process, puis Stop-Process -Id <pid> -Force avant relance."],
                ["Le service Flask échoue au démarrage : 'View function mapping is overwriting an existing endpoint function: dashboard'.", "Deux fonctions Python sont enregistrées sous le même endpoint dashboard dans server.py (résidu d'une route stub utilisée temporairement).", "Suppression du stub temporaire. Lancement d'un grep sur @app.route pour vérifier l'absence d'autres doublons."],
                ["Erreur de syntaxe Python à l'import de config.py, ligne 1.", "Caractère parasite (artefact de copier-coller depuis un éditeur) en tout début de fichier.", "Suppression du caractère, ré-enregistrement du fichier en encodage UTF-8 sans BOM."],
                ["Le tableau des passages affiche un timestamp brut peu lisible.", "SQLite retourne la colonne timestamp sous forme de chaîne ISO 8601 complète.", "Tronquage à 19 caractères dans le template Jinja ({{ p.timestamp[:19] }}), suffisant pour afficher AAAA-MM-JJ HH:MM:SS."],
            ],
            [3000, 3000, 3070],
        ),
        p("Ces erreurs sont caractéristiques des architectures réparties : un point de blocage sur une machine se manifeste comme un échec sur une autre, et la lecture croisée des logs Pi / Windows / ESP32 est indispensable au diagnostic."),
    ];
}

// =====================================================================
// SECTION 10 — AMÉLIORATIONS ENVISAGÉES
// =====================================================================
function section10Ameliorations() {
    return [
        h1("10. Améliorations envisagées"),
        p("Le projet livré constitue un prototype fonctionnel. Plusieurs pistes d'amélioration, classées par horizon temporel, permettent de le rapprocher progressivement du périmètre initialement demandé par le CESE."),

        h2("10.1 Court terme (consolidation du prototype)"),
        bullet("Authentification API entre l'ESP32 et le Pi : ajout d'un jeton partagé (clé HMAC ou Bearer token) dans l'en-tête Authorization de chaque POST, vérifié côté Flask avant traitement. Sans ce mécanisme, n'importe quel client du réseau local peut simuler un scan."),
        bullet("HTTPS auto-signé sur le Pi : génération d'un certificat self-signed via openssl, configuration de Flask derrière un proxy léger (nginx ou Caddy). Élimine la circulation en clair du jeton."),
        bullet("Export CSV de l'historique : ajout d'une route /historique/export qui renvoie un fichier CSV téléchargeable, utilisable pour audit ou retraitement Excel."),
        bullet("Multi-utilisateurs admins avec rôles : extension de la table admins avec un champ role (admin, lecteur) ; séparation des décorateurs @admin_required et @lecteur_required selon les routes."),
        bullet("Rotation périodique du mot de passe admin par défaut et invalidation du compte admin/admin au premier démarrage productif."),

        h2("10.2 Moyen terme (extension fonctionnelle)"),
        bullet("Ajout du second lecteur (QR code) sur l'ESP32 — par exemple un module GM65 en série — et fusion des deux flux d'identification dans la même requête (machine + utilisateur)."),
        bullet("Migration de la persistance vers MariaDB sur un serveur dédié, une fois le renouvellement des serveurs CESE achevé. L'isolation par database.py rend cette migration limitée : seule la fonction get_conn() et quelques détails de syntaxe SQL sont à adapter."),
        bullet("Extension du listener PowerShell à d'autres actions de maintenance : inventaire WMI (Get-CimInstance), déploiement d'un patch ciblé via Microsoft Update Catalog, exécution d'un script de configuration signé."),
        bullet("Mise en place d'une supervision (Prometheus + Grafana ou solution équivalente) : exposition d'une route /metrics côté Flask, alerting sur l'absence prolongée de scan ou sur un taux de refus anormal."),
        bullet("Tests automatisés : ajout d'une suite pytest couvrant les routes critiques (login, /api/badge) et d'un script d'intégration simulant un scan complet via requests."),

        h2("10.3 Long terme (réintégration du scope initial CESE)"),
        bullet("Réintroduction d'un agent PowerShell de migration, en mode strictement opt-in et signé, avec accord formel de la DSI sur le périmètre exact d'actions exécutables."),
        bullet("Intégration progressive de la jonction Active Directory automatique, sur un sous-domaine de pré-production CESE dédié, avant tout déploiement sur le domaine de production."),
        bullet("Déploiement pilote sur un échantillon de postes (3 à 5 stations) avant industrialisation, avec revue de retour d'expérience tous les 15 jours."),
        bullet("Documentation utilisateur et formation des techniciens du service IT du CESE à l'utilisation et à la maintenance du système (manuel d'exploitation, procédures de redémarrage, scénarios d'incident)."),
        p("Cette trajectoire, étalée sur plusieurs mois et associant la DSI dès le départ, transforme le prototype actuel en un outil opérationnel intégré au système d'information du CESE, sans rejouer depuis zéro les choix techniques fondateurs."),
    ];
}

// =====================================================================
// SECTION 11 — CONCLUSION
// =====================================================================
function section11Conclusion() {
    return [
        h1("11. Conclusion"),
        h2("11.1 Bilan technique"),
        p("Le projet a abouti à un prototype fonctionnel et démontrable : une station d'authentification RFID complète, couplée à un dashboard d'administration web et à un mécanisme de déclenchement distant sur un poste Windows. L'ensemble s'exécute de façon stable sur trois machines hétérogènes (ESP32, Raspberry Pi, PC Windows) communiquant en HTTP REST sur un réseau local, avec une persistance SQLite, un dashboard sécurisé par authentification et une journalisation systématique des passages."),
        p("Sur le plan des compétences mobilisées, j'ai pu mettre en pratique l'ensemble du spectre d'un technicien CIEL option IR : développement embarqué C++, programmation Python orientée web avec Flask, base de données relationnelle, scripting système PowerShell, intégration d'API Windows, configuration réseau et pare-feu, déploiement de services par systemd et par le planificateur de tâches, stratégie de tests par couches, et diagnostic d'incidents distribués."),

        h2("11.2 Bilan personnel"),
        p("L'apprentissage le plus important de ce projet n'est probablement pas technique. Il tient au pivot du périmètre face aux contraintes rencontrées au CESE. Devant un cahier des charges ambitieux et une infrastructure cible mouvante, la tentation aurait été soit de s'entêter sur le scope initial au risque de ne rien livrer, soit de réduire l'ambition au point de perdre tout intérêt pédagogique. La voie tenue — recentrer sur un sous-périmètre homogène qui démontre les mêmes compétences sur un cas d'usage déployable — m'a appris en pratique ce que veut dire arbitrer entre ambition et réalité, en concertation avec un commanditaire."),
        p("Cette posture est, à mes yeux, ce que le BTS CIEL prépare réellement : non pas la capacité d'exécuter une commande, mais celle de reformuler le besoin face à un blocage et de livrer quelque chose qui a du sens dans le temps et avec les ressources disponibles."),

        h2("11.3 Lien avec le référentiel BTS CIEL"),
        p("Le projet couvre plusieurs blocs du référentiel d'activités professionnelles de l'option Informatique et Réseaux : analyse d'un besoin client et formalisation d'un cahier des charges, conception d'une architecture client/serveur, développement embarqué et développement applicatif, déploiement et configuration de services système, intégration et tests, documentation technique, communication écrite et orale du travail réalisé."),
        p("Au-delà de ces blocs, l'expérience acquise sur la gestion d'un pivot de scope en cours de projet, l'arbitrage avec un commanditaire et la justification rigoureuse de choix techniques est précisément ce qui prépare au métier."),
    ];
}

// =====================================================================
// ANNEXES
// =====================================================================
function annexes() {
    return [
        h1("Annexes"),

        h2("Annexe A — Extraits de code commentés"),
        h3("A.1 Logique de décision /api/badge (server.py)"),
        ...codeBlock([
            "@app.route(\"/api/badge\", methods=[\"POST\"])",
            "def api_badge():",
            "    data = request.get_json(silent=True)",
            "    if not data or \"uid\" not in data:",
            "        return jsonify({\"erreur\": \"JSON invalide\"}), 400",
            "    uid = data[\"uid\"].upper().strip()",
            "    badge = db.get_badge_by_uid(uid)",
            "    if badge is None:",
            "        nom, autorise, declenche = \"Inconnu\", False, False",
            "    else:",
            "        nom = badge[\"nom\"]",
            "        autorise = bool(badge[\"autorise\"])",
            "        declenche = declencher_windows({...}) if autorise else False",
            "    db.log_passage(uid=uid, nom=nom, autorise=autorise, declenche=declenche)",
            "    return jsonify({...})",
        ].join("\n")),

        h3("A.2 Initialisation des tables (database.py)"),
        ...codeBlock([
            "CREATE TABLE IF NOT EXISTS badges (",
            "    id          INTEGER PRIMARY KEY AUTOINCREMENT,",
            "    uid         TEXT    UNIQUE NOT NULL,",
            "    nom         TEXT    NOT NULL,",
            "    autorise    INTEGER NOT NULL DEFAULT 1,",
            "    date_ajout  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,",
            "    note        TEXT",
            ");",
            "CREATE TABLE IF NOT EXISTS passages (",
            "    id         INTEGER PRIMARY KEY AUTOINCREMENT,",
            "    timestamp  TIMESTAMP NOT NULL,",
            "    uid        TEXT    NOT NULL,",
            "    nom        TEXT    NOT NULL,",
            "    autorise   INTEGER NOT NULL,",
            "    declenche  INTEGER NOT NULL DEFAULT 0",
            ");",
            "CREATE INDEX IF NOT EXISTS idx_passages_uid ON passages(uid);",
            "CREATE INDEX IF NOT EXISTS idx_passages_ts  ON passages(timestamp);",
        ].join("\n")),

        h3("A.3 Lecture RFID (code_esp32.ino)"),
        ...codeBlock([
            "String uid = \"\";",
            "for (byte i = 0; i < rfid.uid.size; i++) {",
            "    uid += String(rfid.uid.uidByte[i] < 0x10 ? \"0\" : \"\");",
            "    uid += String(rfid.uid.uidByte[i], HEX);",
            "    if (i < rfid.uid.size - 1) uid += \":\";",
            "}",
            "uid.toUpperCase();",
            "HTTPClient http;",
            "http.begin(RPI_URL);",
            "http.addHeader(\"Content-Type\", \"application/json\");",
            "int code = http.POST(\"{\\\"uid\\\":\\\"\" + uid + \"\\\"}\");",
        ].join("\n")),

        h2("Annexe B — Référentiel des routes Flask"),
        ...table(
            ["Méthode", "Route", "Authentification", "Description"],
            [
                ["POST", "/api/badge", "publique (réseau local)", "Reçoit un UID depuis l'ESP32, applique la logique, journalise."],
                ["GET", "/api/health", "publique", "Endpoint de monitoring."],
                ["GET / POST", "/login", "publique", "Formulaire de connexion + traitement."],
                ["GET", "/logout", "publique", "Déconnexion (vide la session)."],
                ["GET", "/", "@login_required", "Tableau de bord (stats + derniers passages + top)."],
                ["GET", "/badges", "@login_required", "Liste des badges (READ)."],
                ["POST", "/badges/add", "@login_required", "Ajout d'un badge (CREATE)."],
                ["POST", "/badges/<id>/toggle", "@login_required", "Activation/désactivation (UPDATE)."],
                ["POST", "/badges/<id>/delete", "@login_required", "Suppression (DELETE)."],
                ["GET", "/historique", "@login_required", "Historique filtré par UID, statut, limite."],
                ["GET", "/stats", "@login_required", "Statistiques agrégées + graphiques Chart.js."],
            ],
            [1200, 2400, 2000, 3470],
        ),

        h2("Annexe C — Commandes utiles de maintenance"),
        h3("C.1 Côté Raspberry Pi"),
        ...codeBlock([
            "# Démarrage / redémarrage du service Flask",
            "sudo systemctl start  rfid-dashboard.service",
            "sudo systemctl restart rfid-dashboard.service",
            "sudo systemctl status rfid-dashboard.service",
            "",
            "# Lecture des 50 derniers logs",
            "sudo journalctl -u rfid-dashboard.service -n 50 --no-pager",
            "",
            "# Test rapide de l'API",
            "curl -s http://localhost:5000/api/health | python3 -m json.tool",
            "curl -X POST -H \"Content-Type: application/json\" \\",
            "     -d '{\"uid\":\"5E:ED:DB:6F\"}' http://localhost:5000/api/badge",
        ].join("\n")),
        h3("C.2 Côté Windows"),
        ...codeBlock([
            "# Identifier qui détient le port 8080",
            "Get-NetTCPConnection -LocalPort 8080 | Select OwningProcess",
            "Get-Process -Id <pid>",
            "",
            "# Démarrer / arrêter la tâche planifiée du listener",
            "schtasks /run    /tn \"RFID-Listener\"",
            "schtasks /end    /tn \"RFID-Listener\"",
            "schtasks /query  /tn \"RFID-Listener\" /v /fo LIST",
            "",
            "# Test du listener depuis le Pi",
            "curl -X POST -H \"Content-Type: application/json\" \\",
            "     -d '{\"source\":\"test\",\"uid\":\"AA:BB:CC:DD\",\"nom\":\"Test\"}' \\",
            "     http://192.168.20.205:8080/trigger",
        ].join("\n")),

        h2("Annexe D — Glossaire"),
        ...table(
            ["Sigle", "Signification", "Rôle dans le projet"],
            [
                ["RFID", "Radio Frequency Identification", "Technologie d'identification sans contact par radio. Utilisée pour les badges."],
                ["MIFARE", "Famille de puces NXP", "Standard des cartes utilisées (MIFARE Classic 1K, 13,56 MHz)."],
                ["UID", "Unique Identifier", "Identifiant unique de chaque carte MIFARE, lu par le RC522."],
                ["REST", "Representational State Transfer", "Style d'architecture HTTP utilisé entre l'ESP32, le Pi et le listener."],
                ["CRUD", "Create / Read / Update / Delete", "Cycle de gestion des badges dans le dashboard."],
                ["PRG", "Post / Redirect / Get", "Pattern Flask qui prévient les soumissions doubles."],
                ["PBKDF2", "Password-Based Key Derivation Function 2", "Algorithme de hash utilisé par werkzeug.security pour les mots de passe admin."],
                ["MQTT", "Message Queuing Telemetry Transport", "Middleware temps réel prévu dans le scope initial, non retenu pour la v2."],
                ["AD", "Active Directory", "Annuaire Microsoft. Cible de jonction prévue à l'origine, non retenue pour la v2."],
                ["GPO", "Group Policy Object", "Politique de groupe AD. Application initialement prévue côté agent, non retenue."],
                ["WMI", "Windows Management Instrumentation", "API Windows d'introspection, candidate pour la phase 2."],
                ["ICMP", "Internet Control Message Protocol", "Protocole utilisé par ping, autorisé via une règle de pare-feu dédiée."],
            ],
            [1400, 3400, 4270],
        ),

        h2("Annexe E — Cahier des charges initial du CESE"),
        p("Cette annexe renvoie au document de référence fourni par le CESE en début de projet : 01-Fiche_Modernisation_et_Administration_du_Parc_Informatique_du_CESE.odt. Ce document, transmis par Matthieu Mainviel, formalise le besoin tel qu'exprimé initialement et constitue la pièce de référence par rapport à laquelle la section 4 de ce rapport justifie chaque décision de recentrage."),
        p("[À insérer par l'étudiant : copie ou résumé fidèle de la fiche projet, avec mention de l'autorisation de reproduction si demandée par le CESE.]", { italics: true, color: "808080" }),
    ];
}

// =====================================================================
// ASSEMBLAGE DU DOCUMENT
// =====================================================================
const header = new Header({
    children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({
            text: "Rapport E6 — Station d'authentification RFID — CESE",
            font: "Calibri", size: 18, italics: true, color: "808080",
        })],
    })],
});

const footer = new Footer({
    children: [new Paragraph({
        tabStops: [
            { type: TabStopType.RIGHT, position: CONTENT_W },
        ],
        children: [
            new TextRun({ text: "Rapport E6 — Thomas Caron — CESE", font: "Calibri", size: 18, color: "808080" }),
            new TextRun({ text: "\t", font: "Calibri", size: 18 }),
            new TextRun({ text: "Page ", font: "Calibri", size: 18, color: "808080" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: "808080" }),
            new TextRun({ text: " / ", font: "Calibri", size: 18, color: "808080" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 18, color: "808080" }),
        ],
    })],
});

const allChildren = [
    ...pageDeGarde(),
    ...sommaire(),
    ...remerciements(),
    ...section1Introduction(),
    ...section2Contexte(),
    ...section3CahierCharges(),
    ...section4Recentrage(),
    ...section5Architecture(),
    ...section6Materiel(),
    ...section7Logiciel(),
    ...section8Reseau(),
    ...section9Tests(),
    ...section10Ameliorations(),
    ...section11Conclusion(),
    ...annexes(),
];

const doc = new Document({
    creator: "Thomas Caron",
    title: "Rapport E6 — Station d'authentification RFID — CESE",
    description: "Rapport de stage BTS CIEL option Informatique et Réseaux",
    styles: {
        default: {
            document: { run: { font: "Calibri", size: 22 } }, // 11pt
        },
        paragraphStyles: [
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { size: 36, bold: true, font: "Calibri", color: COLOR_TITLE },
              paragraph: { spacing: { before: 240, after: 180, line: 276 }, outlineLevel: 0 } },
            { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { size: 28, bold: true, font: "Calibri", color: COLOR_TITLE },
              paragraph: { spacing: { before: 200, after: 120, line: 276 }, outlineLevel: 1 } },
            { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { size: 24, bold: true, font: "Calibri", color: COLOR_SUBTITLE },
              paragraph: { spacing: { before: 160, after: 80, line: 276 }, outlineLevel: 2 } },
        ],
    },
    numbering: {
        config: [
            {
                reference: "bullets",
                levels: [{
                    level: 0,
                    format: LevelFormat.BULLET,
                    text: "•",
                    alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } },
                }],
            },
        ],
    },
    sections: [{
        properties: {
            page: {
                size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
                margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN, header: 720, footer: 720 },
            },
        },
        headers: { default: header },
        footers: { default: footer },
        children: allChildren,
    }],
});

Packer.toBuffer(doc).then(buffer => {
    const out = path.join(__dirname, "Rapport_E6_RFID_Caron.docx");
    fs.writeFileSync(out, buffer);
    const stat = fs.statSync(out);
    console.log(`[OK] Fichier généré : ${out}`);
    console.log(`[OK] Taille : ${(stat.size / 1024).toFixed(1)} Ko`);
}).catch(err => {
    console.error("[ERREUR]", err);
    process.exit(1);
});
