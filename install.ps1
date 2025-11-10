# LibriAssist - Script d'installation automatique
# Exécuter avec : .\install.ps1

Write-Host "
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          📚 LibriAssist - Installation Setup 📚           ║
║                                                            ║
║              Chatbot RAG pour CoolLibri                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Vérifier Python
Write-Host "`n[1/5] Vérification de Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python trouvé: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python n'est pas installé !" -ForegroundColor Red
    Write-Host "   Téléchargez Python depuis: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Vérifier Node.js
Write-Host "`n[2/5] Vérification de Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js trouvé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js n'est pas installé !" -ForegroundColor Red
    Write-Host "   Téléchargez Node.js depuis: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Installation du backend
Write-Host "`n[3/5] Installation du backend Python..." -ForegroundColor Yellow
Set-Location backend

Write-Host "   → Création de l'environnement virtuel..." -ForegroundColor Cyan
python -m venv venv

Write-Host "   → Activation de l'environnement virtuel..." -ForegroundColor Cyan
.\venv\Scripts\Activate.ps1

Write-Host "   → Installation des dépendances Python..." -ForegroundColor Cyan
pip install -r requirements.txt --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend installé avec succès !" -ForegroundColor Green
} else {
    Write-Host "✗ Erreur lors de l'installation du backend" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Installation du frontend
Write-Host "`n[4/5] Installation du frontend Next.js..." -ForegroundColor Yellow
Set-Location frontend

Write-Host "   → Installation des dépendances Node.js..." -ForegroundColor Cyan
npm install --silent

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend installé avec succès !" -ForegroundColor Green
} else {
    Write-Host "✗ Erreur lors de l'installation du frontend" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Vérifier Ollama
Write-Host "`n[5/5] Vérification d'Ollama..." -ForegroundColor Yellow
try {
    $ollamaVersion = ollama --version 2>&1
    Write-Host "✓ Ollama trouvé: $ollamaVersion" -ForegroundColor Green
    
    Write-Host "`n   → Vérification du modèle Mistral..." -ForegroundColor Cyan
    $models = ollama list 2>&1
    if ($models -match "mistral") {
        Write-Host "✓ Modèle Mistral déjà installé" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Le modèle Mistral n'est pas installé" -ForegroundColor Yellow
        Write-Host "   Voulez-vous le télécharger maintenant ? (Cela peut prendre plusieurs minutes)" -ForegroundColor Yellow
        $response = Read-Host "   (O/N)"
        if ($response -eq "O" -or $response -eq "o") {
            Write-Host "   → Téléchargement de Mistral 7B..." -ForegroundColor Cyan
            ollama pull mistral:7b
        } else {
            Write-Host "   ⚠ N'oubliez pas de télécharger le modèle avec: ollama pull mistral:7b" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "✗ Ollama n'est pas installé !" -ForegroundColor Red
    Write-Host "   Téléchargez Ollama depuis: https://ollama.ai/" -ForegroundColor Yellow
    Write-Host "   Après installation, exécutez: ollama pull mistral:7b" -ForegroundColor Yellow
}

# Résumé
Write-Host "
╔════════════════════════════════════════════════════════════╗
║                  Installation terminée ! 🎉                ║
╚════════════════════════════════════════════════════════════╝

Prochaines étapes :

1. Indexer les documents :
   cd backend
   .\venv\Scripts\Activate.ps1
   python scripts\index_documents.py

2. Démarrer le backend :
   python main.py

3. Dans un nouveau terminal, démarrer le frontend :
   cd frontend
   npm run dev

4. Ouvrir http://localhost:3000 dans votre navigateur

📖 Pour plus d'informations, consultez QUICKSTART.md

" -ForegroundColor Green

Write-Host "Bon développement avec LibriAssist ! 🚀" -ForegroundColor Cyan
