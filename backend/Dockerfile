# Utiliser l'image Python officielle
FROM python:3.11-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers de requirements
COPY requirements-hf.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements-hf.txt

# Copier tout le code backend
COPY . .

# Exposer le port 7860 (standard HF Spaces)
EXPOSE 7860

# Variable d'environnement pour le port
ENV PORT=7860

# Commande de démarrage
CMD ["python", "app.py"]
