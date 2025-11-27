# start_backend_parallel.ps1
# Script pour démarrer le backend FastAPI avec plusieurs workers

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   BACKEND - Mode Multi-Workers      " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Aller dans le dossier backend
Set-Location -Path "$PSScriptRoot\backend"

# Activer l'environnement virtuel si présent
$venvPath = "$PSScriptRoot\.venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "Activation de l'environnement virtuel..." -ForegroundColor Yellow
    & $venvPath
}

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  - Workers  : 2" -ForegroundColor Green
Write-Host "  - Host     : 0.0.0.0" -ForegroundColor Green
Write-Host "  - Port     : 8000" -ForegroundColor Green
Write-Host ""
Write-Host "Démarrage du backend..." -ForegroundColor Yellow
Write-Host "URL: http://localhost:8000" -ForegroundColor Magenta
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Magenta
Write-Host ""

# Démarrer avec 2 workers pour gérer plus de connexions
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
