# LibriAssist - Script de démarrage rapide
# Exécuter avec : .\start.ps1

Write-Host "
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║            🚀 LibriAssist - Démarrage rapide 🚀           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Vérifier que l'installation est complète
if (-not (Test-Path "backend\venv")) {
    Write-Host "✗ L'environnement virtuel Python n'existe pas !" -ForegroundColor Red
    Write-Host "  Exécutez d'abord: .\install.ps1" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "✗ Les dépendances Node.js ne sont pas installées !" -ForegroundColor Red
    Write-Host "  Exécutez d'abord: .\install.ps1" -ForegroundColor Yellow
    exit 1
}

# Démarrer Ollama en arrière-plan (si nécessaire)
Write-Host "`n[1/3] Vérification d'Ollama..." -ForegroundColor Yellow
try {
    $ollamaRunning = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    if ($ollamaRunning) {
        Write-Host "✓ Ollama est déjà en cours d'exécution" -ForegroundColor Green
    } else {
        Write-Host "→ Démarrage d'Ollama..." -ForegroundColor Cyan
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Host "✓ Ollama démarré" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Ollama n'est pas installé ou n'a pas pu démarrer" -ForegroundColor Yellow
    Write-Host "  L'API fonctionnera en mode dégradé" -ForegroundColor Yellow
}

# Démarrer le backend
Write-Host "`n[2/3] Démarrage du backend..." -ForegroundColor Yellow
Write-Host "→ Ouverture d'une nouvelle fenêtre pour le backend" -ForegroundColor Cyan

$backendScript = @"
Set-Location '$PSScriptRoot\backend'
.\venv\Scripts\Activate.ps1
Write-Host '🔧 Démarrage de LibriAssist API...' -ForegroundColor Green
python main.py
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

# Attendre que le backend soit prêt
Write-Host "→ Attente du démarrage du backend..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Démarrer le frontend
Write-Host "`n[3/3] Démarrage du frontend..." -ForegroundColor Yellow
Write-Host "→ Ouverture d'une nouvelle fenêtre pour le frontend" -ForegroundColor Cyan

$frontendScript = @"
Set-Location '$PSScriptRoot\frontend'
Write-Host '🎨 Démarrage de LibriAssist Frontend...' -ForegroundColor Green
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

# Message final
Write-Host "
╔════════════════════════════════════════════════════════════╗
║                LibriAssist est en cours ! 🎉              ║
╚════════════════════════════════════════════════════════════╝

✓ Backend démarré sur : http://localhost:8000
✓ Frontend démarré sur : http://localhost:3000

→ Ouvrez votre navigateur sur : http://localhost:3000

📖 Documentation API : http://localhost:8000/docs

Pour arrêter les services, fermez les fenêtres PowerShell ouvertes.

" -ForegroundColor Green

# Attendre quelques secondes puis ouvrir le navigateur
Write-Host "Ouverture du navigateur dans 5 secondes..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
Start-Process "http://localhost:3000"

Write-Host "`nBon développement ! 🚀" -ForegroundColor Cyan
