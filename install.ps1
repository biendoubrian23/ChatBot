# LibriAssist - Script d'installation automatique
# Executer avec : .\install.ps1

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         LibriAssist - Installation Setup                  " -ForegroundColor Cyan
Write-Host "              Chatbot RAG pour CoolLibri                   " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier Python
Write-Host "[1/5] Verification de Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python trouve: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Python n'est pas installe !" -ForegroundColor Red
    Write-Host "   Telechargez Python depuis: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Verifier Node.js
Write-Host ""
Write-Host "[2/5] Verification de Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[OK] Node.js trouve: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Node.js n'est pas installe !" -ForegroundColor Red
    Write-Host "   Telechargez Node.js depuis: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Installation du backend
Write-Host ""
Write-Host "[3/5] Installation du backend Python..." -ForegroundColor Yellow
Set-Location backend

Write-Host "   -> Creation de l'environnement virtuel..." -ForegroundColor Cyan
python -m venv venv

Write-Host "   -> Activation de l'environnement virtuel..." -ForegroundColor Cyan
.\venv\Scripts\Activate.ps1

Write-Host "   -> Installation des dependances Python..." -ForegroundColor Cyan
pip install -r requirements.txt --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backend installe avec succes !" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Erreur lors de l'installation du backend" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Installation du frontend
Write-Host ""
Write-Host "[4/5] Installation du frontend Next.js..." -ForegroundColor Yellow
Set-Location frontend

Write-Host "   -> Installation des dependances Node.js..." -ForegroundColor Cyan
npm install --silent

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Frontend installe avec succes !" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Erreur lors de l'installation du frontend" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Verifier Ollama
Write-Host ""
Write-Host "[5/5] Verification d'Ollama..." -ForegroundColor Yellow
try {
    $ollamaVersion = ollama --version 2>&1
    Write-Host "[OK] Ollama trouve: $ollamaVersion" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "   -> Verification du modele Mistral..." -ForegroundColor Cyan
    $models = ollama list 2>&1
    if ($models -match "mistral") {
        Write-Host "[OK] Modele Mistral deja installe" -ForegroundColor Green
    } else {
        Write-Host "[ATTENTION] Le modele Mistral n'est pas installe" -ForegroundColor Yellow
        Write-Host "   Voulez-vous le telecharger maintenant ? (Cela peut prendre plusieurs minutes)" -ForegroundColor Yellow
        $response = Read-Host "   (O/N)"
        if ($response -eq "O" -or $response -eq "o") {
            Write-Host "   -> Telechargement de Mistral 7B..." -ForegroundColor Cyan
            ollama pull mistral:7b
        } else {
            Write-Host "[ATTENTION] N'oubliez pas de telecharger le modele avec: ollama pull mistral:7b" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "[ERREUR] Ollama n'est pas installe !" -ForegroundColor Red
    Write-Host "   Telechargez Ollama depuis: https://ollama.ai/" -ForegroundColor Yellow
    Write-Host "   Apres installation, executez: ollama pull mistral:7b" -ForegroundColor Yellow
}

# Resume
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "              Installation terminee !                       " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes :" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Indexer les documents :" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "   python scripts\index_documents.py" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Demarrer le backend :" -ForegroundColor White
Write-Host "   python main.py" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Dans un nouveau terminal, demarrer le frontend :" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Ouvrir http://localhost:3000 dans votre navigateur" -ForegroundColor White
Write-Host ""
Write-Host "Pour plus d'informations, consultez QUICKSTART.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Bon developpement avec LibriAssist !" -ForegroundColor Cyan
Write-Host ""
