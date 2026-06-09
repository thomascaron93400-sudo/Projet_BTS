"""
Module d'accès aux données SQLite.
Toute la logique base de données est encapsulée ici.
"""
import sqlite3
from datetime import datetime
from contextlib import contextmanager
from werkzeug.security import generate_password_hash

from config import DB_PATH


# ============================================================
# CONNEXION : context manager pour gérer ouverture/fermeture
# ============================================================
@contextmanager
def get_conn():
    """
    Context manager qui ouvre une connexion SQLite, la cède au
    bloc 'with', commit automatiquement si tout va bien,
    rollback si exception, et ferme dans tous les cas.

    Usage :
        with get_conn() as conn:
            conn.execute("...")
    """
    conn = sqlite3.connect(DB_PATH)
    # Permet d'accéder aux colonnes par nom : row['uid'] au lieu de row[0]
    conn.row_factory = sqlite3.Row
    # Active le support des clés étrangères (désactivé par défaut en SQLite)
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ============================================================
# INITIALISATION : création des tables si elles n'existent pas
# ============================================================
def init_db():
    """Crée les tables au premier lancement. Idempotent."""
    with get_conn() as conn:
        # Table badges : la liste des UID connus
        conn.execute("""
            CREATE TABLE IF NOT EXISTS badges (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                uid         TEXT    UNIQUE NOT NULL,
                nom         TEXT    NOT NULL,
                autorise    INTEGER NOT NULL DEFAULT 1,
                date_ajout  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                note        TEXT
            )
        """)

        # Table passages : un enregistrement par scan
        conn.execute("""
            CREATE TABLE IF NOT EXISTS passages (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp  TIMESTAMP NOT NULL,
                uid        TEXT    NOT NULL,
                nom        TEXT    NOT NULL,
                autorise   INTEGER NOT NULL,
                declenche  INTEGER NOT NULL DEFAULT 0
            )
        """)

        # Index sur uid et timestamp pour accélérer les requêtes d'historique
        conn.execute("CREATE INDEX IF NOT EXISTS idx_passages_uid ON passages(uid)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_passages_ts ON passages(timestamp)")

        # Table admins : utilisateurs du dashboard
        conn.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                username       TEXT    UNIQUE NOT NULL,
                password_hash  TEXT    NOT NULL,
                date_creation  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
    print(f"[DB] Base SQLite initialisée : {DB_PATH}")


def ensure_admin(username: str, password: str):
    """Crée l'admin par défaut s'il n'existe pas encore."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM admins WHERE username = ?", (username,)
        ).fetchone()
        if row is None:
            password_hash = generate_password_hash(password)
            conn.execute(
                "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
                (username, password_hash),
            )
            print(f"[DB] Admin '{username}' créé.")
        else:
            print(f"[DB] Admin '{username}' déjà présent.")


# ============================================================
# BADGES : opérations CRUD
# ============================================================
def get_badge_by_uid(uid: str):
    """Renvoie un badge (row) ou None s'il n'existe pas."""
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM badges WHERE uid = ?", (uid.upper().strip(),)
        ).fetchone()


def list_badges():
    """Renvoie tous les badges, triés par date d'ajout descendante."""
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM badges ORDER BY date_ajout DESC"
        ).fetchall()


def add_badge(uid: str, nom: str, autorise: bool = True, note: str = ""):
    """Ajoute un badge. Lève sqlite3.IntegrityError si UID existe déjà."""
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO badges (uid, nom, autorise, note)
               VALUES (?, ?, ?, ?)""",
            (uid.upper().strip(), nom.strip(), 1 if autorise else 0, note.strip()),
        )


def update_badge(badge_id: int, nom: str, autorise: bool, note: str):
    """Met à jour les infos d'un badge."""
    with get_conn() as conn:
        conn.execute(
            """UPDATE badges
               SET nom = ?, autorise = ?, note = ?
               WHERE id = ?""",
            (nom.strip(), 1 if autorise else 0, note.strip(), badge_id),
        )


def delete_badge(badge_id: int):
    """Supprime un badge. L'historique des passages reste intact."""
    with get_conn() as conn:
        conn.execute("DELETE FROM badges WHERE id = ?", (badge_id,))


def toggle_badge(badge_id: int):
    """Inverse l'état autorisé/refusé d'un badge."""
    with get_conn() as conn:
        conn.execute(
            "UPDATE badges SET autorise = 1 - autorise WHERE id = ?", (badge_id,)
        )


# ============================================================
# PASSAGES : enregistrement et lecture de l'historique
# ============================================================
def log_passage(uid: str, nom: str, autorise: bool, declenche: bool):
    """Enregistre un passage dans l'historique."""
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO passages (timestamp, uid, nom, autorise, declenche)
               VALUES (?, ?, ?, ?, ?)""",
            (datetime.now(), uid, nom, 1 if autorise else 0, 1 if declenche else 0),
        )


def list_passages(limit: int = 100, uid_filter: str = None, autorise_filter: str = None):
    """
    Renvoie les derniers passages avec filtres optionnels.
    autorise_filter : 'oui', 'non' ou None pour tous.
    """
    query = "SELECT * FROM passages WHERE 1=1"
    params = []

    if uid_filter:
        query += " AND uid LIKE ?"
        params.append(f"%{uid_filter.upper()}%")

    if autorise_filter == "oui":
        query += " AND autorise = 1"
    elif autorise_filter == "non":
        query += " AND autorise = 0"

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    with get_conn() as conn:
        return conn.execute(query, params).fetchall()


# ============================================================
# STATISTIQUES : agrégations pour le dashboard
# ============================================================
def stats_globales():
    """Renvoie un dict avec les chiffres clés du dashboard."""
    with get_conn() as conn:
        total_scans = conn.execute(
            "SELECT COUNT(*) AS n FROM passages"
        ).fetchone()["n"]

        total_declenchements = conn.execute(
            "SELECT COUNT(*) AS n FROM passages WHERE declenche = 1"
        ).fetchone()["n"]

        total_refus = conn.execute(
            "SELECT COUNT(*) AS n FROM passages WHERE autorise = 0"
        ).fetchone()["n"]

        total_badges = conn.execute(
            "SELECT COUNT(*) AS n FROM badges"
        ).fetchone()["n"]

        badges_actifs = conn.execute(
            "SELECT COUNT(*) AS n FROM badges WHERE autorise = 1"
        ).fetchone()["n"]

        # Taux de refus (en %) — protection division par zéro
        taux_refus = round(100.0 * total_refus / total_scans, 1) if total_scans else 0.0

        return {
            "total_scans": total_scans,
            "total_declenchements": total_declenchements,
            "total_refus": total_refus,
            "total_badges": total_badges,
            "badges_actifs": badges_actifs,
            "taux_refus": taux_refus,
        }


def top_badges(limit: int = 5):
    """Top N des badges les plus scannés (autorisés uniquement)."""
    with get_conn() as conn:
        return conn.execute(
            """SELECT uid, nom, COUNT(*) AS nb_scans
               FROM passages
               WHERE autorise = 1
               GROUP BY uid, nom
               ORDER BY nb_scans DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()


def activite_par_heure():
    """
    Renvoie le nombre de scans par heure de la journée (0-23),
    tous jours confondus. Idéal pour une heatmap horaire.
    """
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT CAST(strftime('%H', timestamp) AS INTEGER) AS heure,
                      COUNT(*) AS n
               FROM passages
               GROUP BY heure
               ORDER BY heure"""
        ).fetchall()
        # On remplit les heures manquantes avec 0
        counts = {h: 0 for h in range(24)}
        for r in rows:
            counts[r["heure"]] = r["n"]
        return counts


def activite_par_jour_semaine():
    """
    Nombre de scans par jour de la semaine (0 = dimanche, 6 = samedi
    selon strftime SQLite). On reconvertit en lundi=0 ... dimanche=6.
    """
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT CAST(strftime('%w', timestamp) AS INTEGER) AS jour,
                      COUNT(*) AS n
               FROM passages
               GROUP BY jour"""
        ).fetchall()
        # strftime %w : dimanche=0 ... samedi=6 → on remappe sur lundi=0
        remap = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}
        counts = {i: 0 for i in range(7)}
        for r in rows:
            counts[remap[r["jour"]]] = r["n"]
        return counts


def activite_7_derniers_jours():
    """Nombre de scans par jour sur les 7 derniers jours, ordre chronologique."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT date(timestamp) AS jour, COUNT(*) AS n
               FROM passages
               WHERE timestamp >= datetime('now', '-7 days')
               GROUP BY jour
               ORDER BY jour"""
        ).fetchall()
        return [(r["jour"], r["n"]) for r in rows]


# ============================================================
# AUTHENTIFICATION : vérification du mot de passe admin
# ============================================================
def get_admin_by_username(username: str):
    """Renvoie le row admin ou None."""
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM admins WHERE username = ?", (username,)
        ).fetchone()
