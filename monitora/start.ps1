# MONITORA - Script de demarrage parallele
# Lance le backend Python et le frontend Next.js en parallele

Write-Host "[START] Demarrage de MONITORA..." -ForegroundColor Cyan

# Verifier que nous sommes dans le bon repertoire
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Fonction pour verifier les dependances
function Test-Dependencies {
    # Verifier Python
    $python = Get-Command python -ErrorAction SilentlyContinue
    if (-not $python) {
        Write-Host "[ERROR] Python n'est pas installe ou pas dans le PATH" -ForegroundColor Red
        return $false
    }
    
    # Verifier Node.js
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Host "[ERROR] Node.js n'est pas installe ou pas dans le PATH" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# Verifier les dependances
if (-not (Test-Dependencies)) {
    Write-Host "Installez les dependances manquantes et reessayez." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[CHECK] Verification de l'environnement..." -ForegroundColor Yellow

# Verifier le fichier .env du backend
if (-not (Test-Path "backend\.env")) {
    Write-Host "[WARN] Fichier backend\.env manquant. Copie depuis .env.example..." -ForegroundColor Yellow
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "   -> Fichier cree. Veuillez editer backend\.env avec vos cles API." -ForegroundColor Yellow
    }
}

# Verifier le fichier .env.local du frontend
if (-not (Test-Path ".env.local")) {
    Write-Host "[WARN] Fichier .env.local manquant. Copie depuis .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "   -> Fichier cree. Veuillez editer .env.local avec vos variables." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[RUN] Demarrage des services..." -ForegroundColor Green

# Demarrer le backend Python
Write-Host "   -> Backend Python (port 8001)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:scriptPath\backend
    python main.py
}

# Attendre un peu que le backend demarre
Start-Sleep -Seconds 3

# Demarrer le frontend Next.js
Write-Host "   -> Frontend Next.js (port 3001)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:scriptPath
    npm run dev
}

Write-Host ""
Write-Host "[OK] Services demarres!" -ForegroundColor Green
Write-Host ""
Write-Host "[URLS]" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:3001" -ForegroundColor White
Write-Host "   Backend:   http://localhost:8001" -ForegroundColor White
Write-Host "   API Docs:  http://localhost:8001/docs" -ForegroundColor White
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter les services..." -ForegroundColor Gray

# Attendre les jobs et afficher les sorties
try {
    while ($true) {
        Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host ""
    Write-Host "[STOP] Arret des services..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $frontendJob -ErrorAction SilentlyContinue
    Write-Host "[OK] Services arretes." -ForegroundColor Green
}
