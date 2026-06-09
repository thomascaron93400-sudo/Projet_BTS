"""
Serveur Flask principal.
- Route /api/badge : appelée par l'ESP32 (JSON)
- Routes dashboard : ajoutées dans les étapes suivantes
"""
from datetime import datetime
import requests
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
import auth
import threading 

import database as db
from config import (
    WINDOWS_URL,
    SECRET_KEY,
    FLASK_PORT,
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_ADMIN_PASSWORD,
)


# ============================================================
# CRÉATION DE L'APPLICATION FLASK
# ============================================================
app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY


# ============================================================
# DÉCLENCHEMENT WINDOWS (helper interne)
# ============================================================
def declencher_windows(payload: dict) -> bool:
    """
    Envoie un POST au listener PowerShell dans un thread séparé.
    Renvoie True immédiatement (le résultat réel est loggé en async).
    """
    def _envoyer():
        try:
            resp = requests.post(WINDOWS_URL, json=payload, timeout=3)
            ok = 200 <= resp.status_code < 300
            print(f"[WIN] Réponse {resp.status_code} — {'OK' if ok else 'KO'}")
        except requests.exceptions.Timeout:
            print("[WIN] Timeout : PC Windows n'a pas répondu")
        except requests.exceptions.ConnectionError:
            print("[WIN] Connexion refusée : listener éteint ou pare-feu ?")
        except Exception as e:
            print(f"[WIN] Erreur : {e}")

    # Lance le POST dans un thread, ne bloque pas Flask
    threading.Thread(target=_envoyer, daemon=True).start()
    return True   # On considère le déclenchement "lancé" (pas forcément réussi)


# ============================================================
# ROUTE API : réception d'un scan depuis l'ESP32
# ============================================================
@app.route("/api/badge", methods=["POST"])
def api_badge():
    """
    Reçoit {"uid": "5E:ED:DB:6F"} depuis l'ESP32.
    Logique :
      1. Cherche le badge en base
      2. S'il est connu et autorisé → déclenche Windows
      3. Enregistre le passage dans l'historique
      4. Renvoie le résultat en JSON
    """
    data = request.get_json(silent=True)
    if not data or "uid" not in data:
        return jsonify({"erreur": "JSON invalide ou clé 'uid' manquante"}), 400

    uid = data["uid"].upper().strip()
    horodatage = datetime.now().strftime("%H:%M:%S")
    print(f"[{horodatage}] Badge scanné : {uid}")

    # Recherche en base
    badge = db.get_badge_by_uid(uid)

    if badge is None:
        nom, autorise, declenche = "Inconnu", False, False
        print(f"  → Badge inconnu, refusé")
    else:
        nom = badge["nom"]
        autorise = bool(badge["autorise"])
        if autorise:
            print(f"  → Badge autorisé : {nom}, déclenchement Windows…")
            declenche = declencher_windows({
                "source": "rfid",
                "uid": uid,
                "nom": nom,
            })
        else:
            print(f"  → Badge connu mais désactivé : {nom}")
            declenche = False

    # Enregistre le passage (toujours, même si refus)
    db.log_passage(uid=uid, nom=nom, autorise=autorise, declenche=declenche)

    return jsonify({
        "status": "ok",
        "uid": uid,
        "nom": nom,
        "autorise": autorise,
        "declenche": declenche,
    })


# ============================================================
# ROUTE DE SANTÉ : utile pour tester rapidement
# ============================================================
@app.route("/api/health", methods=["GET"])
def api_health():
    """Endpoint trivial pour vérifier que le serveur répond."""
    return jsonify({"status": "ok", "service": "rfid-dashboard"})

# ============================================================
# ROUTES AUTHENTIFICATION
# ============================================================
@app.route("/login", methods=["GET", "POST"])
def login():
    """Page de connexion. GET = affiche le formulaire. POST = vérifie."""
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        admin = auth.verifier_credentials(username, password)
        if admin is None:
            flash("Identifiants incorrects.", "error")
            return redirect(url_for("login"))

        auth.connecter_utilisateur(admin)
        flash(f"Bienvenue {admin['username']} !", "success")

        # Redirection vers la page initialement demandée, ou dashboard par défaut
        next_url = request.args.get("next") or url_for("dashboard")
        return redirect(next_url)

    return render_template("login.html")


@app.route("/logout")
def logout():
    """Déconnexion : vide la session et redirige vers /login."""
    auth.deconnecter_utilisateur()
    flash("Vous avez été déconnecté.", "info")
    return redirect(url_for("login"))



# ============================================================
# ROUTES DASHBOARD
# ============================================================
@app.route("/")
@auth.login_required
def dashboard():
    """Page d'accueil : chiffres clés + derniers passages + top badges."""
    stats = db.stats_globales()
    derniers = db.list_passages(limit=10)
    # Conversion des Row SQLite en dict pour Jinja
    derniers_dicts = [dict(r) for r in derniers]
    # Le timestamp sort comme str, on s'assure que c'est bien un str
    for d in derniers_dicts:
        d["timestamp"] = str(d["timestamp"])

    top = [dict(r) for r in db.top_badges(limit=5)]

    return render_template(
        "dashboard.html",
        stats=stats,
        derniers_passages=derniers_dicts,
        top=top,
    )


# Routes stubs : on les remplira aux étapes suivantes,
# mais base.html les référence donc elles doivent exister.


@app.route("/stats")
@auth.login_required
def stats_page():
    return render_template(
        "stats.html",
        stats=db.stats_globales(),
        top=[dict(r) for r in db.top_badges(limit=10)],
        activite_heures=db.activite_par_heure(),
        activite_jours=db.activite_par_jour_semaine(),
        activite_7j=db.activite_7_derniers_jours(),
    )


# ============================================================
# ROUTES BADGES (CRUD)
# ============================================================
import sqlite3  # pour attraper l'IntegrityError sur UID dupliqué


@app.route("/badges")
@auth.login_required
def badges_page():
    """READ : liste tous les badges."""
    badges_rows = db.list_badges()
    badges_list = [dict(r) for r in badges_rows]
    # Conversion timestamp en str
    for b in badges_list:
        if b.get("date_ajout"):
            b["date_ajout"] = str(b["date_ajout"])
    return render_template("badges.html", badges=badges_list)


@app.route("/badges/add", methods=["POST"])
@auth.login_required
def badge_add():
    """CREATE : ajoute un nouveau badge."""
    uid = request.form.get("uid", "").strip()
    nom = request.form.get("nom", "").strip()
    note = request.form.get("note", "").strip()

    # Validation côté serveur
    if not uid or not nom:
        flash("L'UID et le nom sont obligatoires.", "error")
        return redirect(url_for("badges_page"))

    # Validation format UID (chiffres hexa + deux-points)
    import re
    if not re.match(r"^[0-9A-Fa-f:]+$", uid):
        flash("Format UID invalide. Utilise uniquement 0-9, A-F et ':'.", "error")
        return redirect(url_for("badges_page"))

    try:
        db.add_badge(uid=uid, nom=nom, autorise=True, note=note)
        flash(f"Badge « {nom} » ajouté avec succès.", "success")
    except sqlite3.IntegrityError:
        flash(f"Un badge avec l'UID {uid.upper()} existe déjà.", "error")
    except Exception as e:
        flash(f"Erreur lors de l'ajout : {e}", "error")

    return redirect(url_for("badges_page"))


@app.route("/badges/<int:badge_id>/toggle", methods=["POST"])
@auth.login_required
def badge_toggle(badge_id):
    """UPDATE : bascule actif/désactivé."""
    try:
        db.toggle_badge(badge_id)
        flash("Statut du badge mis à jour.", "success")
    except Exception as e:
        flash(f"Erreur : {e}", "error")
    return redirect(url_for("badges_page"))


@app.route("/badges/<int:badge_id>/delete", methods=["POST"])
@auth.login_required
def badge_delete(badge_id):
    """DELETE : supprime définitivement un badge.
       Note : l'historique des passages est conservé (pas de FK cascade)."""
    try:
        db.delete_badge(badge_id)
        flash("Badge supprimé. L'historique des passages a été conservé.", "info")
    except Exception as e:
        flash(f"Erreur lors de la suppression : {e}", "error")
    return redirect(url_for("badges_page"))


@app.route("/historique")
@auth.login_required
def historique_page():
    """Historique avec filtres optionnels via query string."""
    uid_filter = request.args.get("uid", "").strip() or None
    statut_filter = request.args.get("statut", "").strip() or None
    try:
        limit = int(request.args.get("limit", 100))
    except ValueError:
        limit = 100

    passages_rows = db.list_passages(
        limit=limit,
        uid_filter=uid_filter,
        autorise_filter=statut_filter,
    )
    passages_list = [dict(r) for r in passages_rows]
    for p in passages_list:
        p["timestamp"] = str(p["timestamp"])

    return render_template(
        "historique.html",
        passages=passages_list,
        uid_filter=uid_filter,
        statut_filter=statut_filter,
        limit=limit,
    )

# ============================================================
# DÉMARRAGE
# ============================================================
if __name__ == "__main__":
    # Initialise la base et le compte admin par défaut
    db.init_db()
    db.ensure_admin(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD)

    print(f"[FLASK] Démarrage sur 0.0.0.0:{FLASK_PORT}")
    print(f"[FLASK] Routes API :")
    print(f"  POST http://192.168.20.207:{FLASK_PORT}/api/badge")
    print(f"  GET  http://192.168.20.207:{FLASK_PORT}/api/health")

    # host='0.0.0.0' = écoute sur toutes les interfaces réseau,
    # pas seulement localhost. Indispensable pour que l'ESP32 nous joigne.
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=False)
