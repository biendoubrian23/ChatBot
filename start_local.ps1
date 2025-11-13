<#
.SYNOPSIS
    Script de démarrage automatique de LibriAssist (Backend + Ollama + ngrok)

.DESCRIPTION
    Ce script lance automatiquement tous les services nécessaires pour faire tourner
    le chatbot LibriAssist en local avec exposition publique via ngrok.
    
    Architecture:
    - Frontend: Netlify (https://libriassist.netlify.app)
    - Backend: FastAPI local (port 8080)
    - LLM: Ollama avec llama3.1:8b
    - Tunnel: ngrok pour exposition publique
    - Données: 703 documents CoolLibri vectorisés

.NOTES
    Auteur: LibriAssist Team
    Date: 12 novembre 2025
#>

Write-Host "`n" -NoNewline
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "         DEMARRAGE LIBRIASSIST LOCAL          " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour vérifier si un processus écoute sur un port
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Fonction pour afficher les étapes
function Write-Step {
    param(
        [string]$Message,
        [string]$Status = "INFO"
    )
    
    $color = switch ($Status) {
        "SUCCESS" { "Green" }
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        default { "Cyan" }
    }
    
    $icon = switch ($Status) {
        "SUCCESS" { "[OK]" }
        "ERROR" { "[X]" }
        "WARNING" { "[!]" }
        default { "[*]" }
    }
    
    Write-Host "$icon $Message" -ForegroundColor $color
}

# ============================================================
# ÉTAPE 1: Indexation des documents
# ============================================================
Write-Step "ÉTAPE 1/5: Indexation des documents PDF..."

# Vérifier s'il y a des documents à indexer dans le dossier racine docs/
$docsPath = "$PSScriptRoot\docs"
if (Test-Path $docsPath) {
    $pdfCount = (Get-ChildItem -Path $docsPath -Filter "*.pdf" -File).Count
    $txtCount = (Get-ChildItem -Path $docsPath -Filter "*.txt" -File).Count
    $totalDocs = $pdfCount + $txtCount
    
    if ($totalDocs -gt 0) {
        Write-Step "$totalDocs document(s) trouvé(s) - Lancement de l'indexation..." -Status "INFO"
        
        # Aller dans le backend pour l'indexation
        Push-Location "$PSScriptRoot\backend"
        
        # Créer et activer l'environnement virtuel si nécessaire
        if (Test-Path ".venv\Scripts\Activate.ps1") {
            . .venv\Scripts\Activate.ps1
        } else {
            Write-Step "Création de l'environnement virtuel pour l'indexation..." -Status "INFO"
            python -m venv .venv
            . .venv\Scripts\Activate.ps1
            pip install -r requirements.txt
            Write-Step "Environnement prêt pour l'indexation" -Status "SUCCESS"
        }
        
        # Lancer le script d'indexation
        python scripts\index_documents.py
        
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Documents indexés avec succès" -Status "SUCCESS"
        } else {
            Write-Step "Erreur lors de l'indexation" -Status "WARNING"
        }
    } else {
        Write-Step "Aucun nouveau document à indexer" -Status "INFO"
    }
} else {
    Write-Step "Dossier docs/ non trouvé - indexation ignorée" -Status "INFO"
}

Pop-Location

# ============================================================
# ÉTAPE 2: Vérification Ollama
# ============================================================
Write-Step "`nÉTAPE 2/5: Vérification d'Ollama..."

try {
    $ollamaVersion = ollama --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Ollama est installé: $ollamaVersion" -Status "SUCCESS"
    }
} catch {
    Write-Step "Ollama n'est pas installé ou non accessible" -Status "ERROR"
    Write-Host "`n   Installez Ollama depuis: https://ollama.ai/download`n" -ForegroundColor Yellow
    exit 1
}

# Vérifier si Ollama tourne
Write-Step "Vérification du service Ollama..."
try {
    $ollamaTest = ollama list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Service Ollama opérationnel" -Status "SUCCESS"
        
        # Vérifier si le modèle llama3.1:8b est présent
        if ($ollamaTest -match "llama3.1:8b") {
            Write-Step "Modèle llama3.1:8b disponible" -Status "SUCCESS"
        } else {
            Write-Step "Modèle llama3.1:8b non trouvé" -Status "WARNING"
            Write-Host "`n   Téléchargement du modèle (peut prendre quelques minutes)...`n" -ForegroundColor Yellow
            ollama pull llama3.1:8b
            if ($LASTEXITCODE -eq 0) {
                Write-Step "Modèle llama3.1:8b téléchargé avec succès" -Status "SUCCESS"
            } else {
                Write-Step "Erreur lors du téléchargement du modèle" -Status "ERROR"
                exit 1
            }
        }
    }
} catch {
    Write-Step "Service Ollama non démarré, lancement..." -Status "WARNING"
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Step "Service Ollama démarré" -Status "SUCCESS"
}

# ============================================================
# ÉTAPE 3: Activation environnement Python et démarrage backend
# ============================================================
Write-Step "`nÉTAPE 3/5: Démarrage du backend FastAPI..."

# Vérifier si le port 8080 est déjà utilisé
if (Test-Port -Port 8080) {
    Write-Step "Port 8080 déjà utilisé - probablement un backend qui tourne déjà" -Status "WARNING"
} else {
    Write-Step "Activation de l'environnement virtuel Python..."
    
    # Aller dans le dossier backend
    Push-Location "$PSScriptRoot\backend"
    
    # Créer et activer l'environnement virtuel
    if (Test-Path ".venv\Scripts\Activate.ps1") {
        . .venv\Scripts\Activate.ps1
        Write-Step "Environnement virtuel activé" -Status "SUCCESS"
    } else {
        Write-Step "Environnement virtuel non trouvé - création automatique..." -Status "INFO"
        
        # Créer l'environnement virtuel
        python -m venv .venv
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Environnement virtuel créé avec succès" -Status "SUCCESS"
            
            # Activer l'environnement
            . .venv\Scripts\Activate.ps1
            Write-Step "Environnement virtuel activé" -Status "SUCCESS"
            
            # Installer les dépendances
            Write-Step "Installation des dépendances Python..." -Status "INFO"
            pip install -r requirements.txt
            if ($LASTEXITCODE -eq 0) {
                Write-Step "Dépendances installées avec succès" -Status "SUCCESS"
            } else {
                Write-Step "Erreur lors de l'installation des dépendances" -Status "ERROR"
                Pop-Location
                exit 1
            }
        } else {
            Write-Step "Erreur lors de la création de l'environnement virtuel" -Status "ERROR"
            Pop-Location
            exit 1
        }
    }
    
    Write-Step "Lancement de uvicorn sur le port 8080..."
    
    # Lancer le backend en arrière-plan
    $backendProcess = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080" -NoNewWindow -PassThru
    
    Pop-Location
    
    # Attendre que le serveur démarre
    Write-Host "`n   Initialisation du backend (chargement des 703 documents)..." -ForegroundColor Yellow
    $maxWait = 30
    $waited = 0
    $backendReady = $false
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $backendReady = $true
                break
            }
        } catch {
            # Continue à attendre
        }
        
        Write-Host "." -NoNewline
    }
    
    Write-Host ""
    
    if ($backendReady) {
        Write-Step "Backend FastAPI opérationnel sur http://localhost:8080" -Status "SUCCESS"
        Write-Step "703 documents CoolLibri chargés en mémoire" -Status "SUCCESS"
    } else {
        Write-Step "Le backend met plus de temps que prévu à démarrer" -Status "WARNING"
        Write-Host "`n   Vérifiez manuellement: http://localhost:8080/api/v1/health`n" -ForegroundColor Yellow
    }
}

# ============================================================
# ÉTAPE 4: Vérification ngrok
# ============================================================
Write-Step "`nÉTAPE 4/5: Vérification de ngrok..."

try {
    $ngrokVersion = ngrok version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Step "ngrok est installé: $ngrokVersion" -Status "SUCCESS"
    }
} catch {
    Write-Step "ngrok n'est pas installé" -Status "ERROR"
    Write-Host "`n   Installez ngrok depuis: https://ngrok.com/download`n" -ForegroundColor Yellow
    Write-Host "   Puis configurez votre authtoken: ngrok authtoken VOTRE_TOKEN`n" -ForegroundColor Yellow
    exit 1
}

# ============================================================
# ÉTAPE 5: Démarrage du tunnel ngrok
# ============================================================
Write-Step "`nÉTAPE 5/5: Création du tunnel ngrok..."

Write-Host "`n┌─────────────────────────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "│  Lancement du tunnel ngrok...                               │" -ForegroundColor Green
Write-Host "│                                                             │" -ForegroundColor Green
Write-Host "│  IMPORTANT: Gardez cette fenetre OUVERTE !                  │" -ForegroundColor Yellow
Write-Host "│                                                             │" -ForegroundColor Green
Write-Host "│  L'URL ngrok sera affichée ci-dessous.                     │" -ForegroundColor Green
Write-Host "│  Si elle change, mettez a jour Netlify avec:               │" -ForegroundColor Green
Write-Host "│                                                             │" -ForegroundColor Green
Write-Host "│  netlify env:set NEXT_PUBLIC_API_URL 'https://xxx/api/v1'  │" -ForegroundColor Cyan
Write-Host "│  netlify deploy --prod                                     │" -ForegroundColor Cyan
Write-Host "└─────────────────────────────────────────────────────────────┘" -ForegroundColor Green
Write-Host ""

# Lancer ngrok
Start-Sleep -Seconds 2
ngrok http 8080

# Si ngrok s'arrête (Ctrl+C), nettoyer
Write-Host "`n" -NoNewline
Write-Step "Arrêt du tunnel ngrok détecté" -Status "WARNING"
Write-Host "`n⚠️  Le backend continue de tourner en local sur http://localhost:8080" -ForegroundColor Yellow
Write-Host "⚠️  Pour l'arrêter complètement, fermez le processus Python manuellement.`n" -ForegroundColor Yellow
