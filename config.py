"""
Configuration centralisée.
Tout ce qui peut changer entre environnements est ici.
"""
import os

# Chemin absolu du dossier du projet
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Base de données : fichier SQLite dans le dossier projet
DB_PATH = os.path.join(BASE_DIR, "badges.db")

# Adresse du PC Windows (listener PowerShell)
WINDOWS_URL = "http://192.168.20.205:8080/trigger"

# Compte admin par défaut (à changer après le premier login !)
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"

# Clé secrète pour signer les sessions Flask
# En production, génère-la avec : python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY = "remplace-moi-par-une-vraie-cle-secrete-aleatoire"

# Port d'écoute du serveur Flask
FLASK_PORT = 5000
