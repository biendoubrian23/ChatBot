#!/bin/bash
# Script d'installation des dépendances système pour Railway
# Ce script s'exécute automatiquement avant le build

echo "📦 Installation des drivers ODBC pour SQL Server..."

# Installer unixODBC (bibliothèque ODBC)
apt-get update
apt-get install -y unixodbc unixodbc-dev

# Installer les drivers Microsoft ODBC 18 pour SQL Server
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list

apt-get update
ACCEPT_EULA=Y apt-get install -y msodbcsql18

# Installer gcc pour compiler certaines dépendances Python
apt-get install -y gcc g++ python3-dev

echo "✅ Drivers ODBC installés avec succès"
