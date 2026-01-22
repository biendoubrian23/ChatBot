# =====================================================
# MONITORA Backend - Dockerfile pour Scaleway
# =====================================================

FROM python:3.11-slim

# Métadonnées
LABEL maintainer="Messages SAS"
LABEL description="Monitora Backend API"

# Variables d'environnement
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Installer les dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Pour PyODBC (SQL Server)
    curl \
    gnupg2 \
    unixodbc \
    unixodbc-dev \
    # Pour les compilations Python
    gcc \
    g++ \
    python3-dev \
    # Pour sentence-transformers / PyTorch
    libgomp1 \
    # Nettoyage
    && rm -rf /var/lib/apt/lists/*

# Installer le driver ODBC pour SQL Server
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

# Créer le répertoire de travail
WORKDIR /app

# Copier les requirements et installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY . .

# Créer les répertoires de données
RUN mkdir -p /app/data/vectorstores /app/data/documents

# Exposer le port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Commande de démarrage
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
