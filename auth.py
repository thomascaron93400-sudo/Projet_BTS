"""
Module d'authentification.
Fournit le décorateur @login_required et les fonctions de login/logout.
"""
from functools import wraps
from flask import session, redirect, url_for, flash, request
from werkzeug.security import check_password_hash

import database as db


def verifier_credentials(username: str, password: str) -> dict | None:
    """
    Vérifie un username/password.
    Renvoie le row admin si OK, None sinon.
    """
    admin = db.get_admin_by_username(username)
    if admin is None:
        return None
    if not check_password_hash(admin["password_hash"], password):
        return None
    return admin


def connecter_utilisateur(admin_row):
    """Place les infos de l'admin dans la session."""
    session["user_id"] = admin_row["id"]
    session["username"] = admin_row["username"]


def deconnecter_utilisateur():
    """Vide la session."""
    session.clear()


def utilisateur_connecte() -> bool:
    """True si un utilisateur est connecté dans la session courante."""
    return "user_id" in session


def login_required(view_func):
    """
    Décorateur qui protège une route : si pas connecté,
    redirige vers /login avec un message flash.

    Usage :
        @app.route('/dashboard')
        @login_required
        def dashboard():
            return render_template('dashboard.html')
    """
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not utilisateur_connecte():
            flash("Veuillez vous connecter pour accéder à cette page.", "warning")
            # On garde l'URL demandée pour rediriger après login
            return redirect(url_for("login", next=request.path))
        return view_func(*args, **kwargs)
    return wrapper
