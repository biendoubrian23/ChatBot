# start_ollama_parallel.ps1
# Script pour démarrer Ollama avec le parallélisme activé
# Permet à 2-3 utilisateurs de poser des questions en même temps

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   OLLAMA - Mode Parallèle Activé    " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration pour 2-3 utilisateurs simultanés
$env:OLLAMA_NUM_PARALLEL = "3"           # 3 requêtes traitées en parallèle
$env:OLLAMA_MAX_LOADED_MODELS = "1"      # 1 seul modèle en mémoire (économie RAM)
$env:OLLAMA_KEEP_ALIVE = "10m"           # Garde le modèle chargé 10 minutes

# Afficher la configuration
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  - Requêtes parallèles : $env:OLLAMA_NUM_PARALLEL" -ForegroundColor Green
Write-Host "  - Modèles en mémoire  : $env:OLLAMA_MAX_LOADED_MODELS" -ForegroundColor Green
Write-Host "  - Keep Alive          : $env:OLLAMA_KEEP_ALIVE" -ForegroundColor Green
Write-Host ""
Write-Host "Démarrage d'Ollama..." -ForegroundColor Yellow
Write-Host ""

# Démarrer Ollama
ollama serve
