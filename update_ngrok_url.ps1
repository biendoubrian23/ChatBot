<#
.SYNOPSIS
    Script de mise à jour rapide de l'URL ngrok sur Netlify

.DESCRIPTION
    Ce script met à jour automatiquement l'URL ngrok sur Netlify et redéploie le frontend.
    Utilisez-le uniquement quand l'URL ngrok change.

.PARAMETER NgrokUrl
    L'URL ngrok complète (ex: https://xxxx.ngrok-free.dev)

.EXAMPLE
    .\update_ngrok_url.ps1 -NgrokUrl "https://tsunamic-postpositively-noel.ngrok-free.dev"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$NgrokUrl
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔄 MISE À JOUR URL NGROK SUR NETLIFY                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Nettoyer l'URL (enlever le trailing slash si présent)
$NgrokUrl = $NgrokUrl.TrimEnd('/')

# Construire l'URL complète de l'API
$ApiUrl = "$NgrokUrl/api/v1"

Write-Host "🌐 Nouvelle URL API: " -NoNewline -ForegroundColor Yellow
Write-Host $ApiUrl -ForegroundColor Green

# Demander confirmation
Write-Host "`n⚠️  Cette opération va:" -ForegroundColor Yellow
Write-Host "   1. Mettre à jour la variable d'environnement sur Netlify" -ForegroundColor White
Write-Host "   2. Redéployer le frontend (temps estimé: 1-2 minutes)" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Continuer? (O/N)"
if ($confirmation -ne 'O' -and $confirmation -ne 'o') {
    Write-Host "`n❌ Opération annulée`n" -ForegroundColor Red
    exit 0
}

# Aller dans le dossier frontend
Push-Location "$PSScriptRoot\frontend"

Write-Host "`n📝 Étape 1/3: Mise à jour du fichier .env.production..." -ForegroundColor Cyan
try {
    "NEXT_PUBLIC_API_URL=$ApiUrl" | Out-File -FilePath ".env.production" -Encoding UTF8
    Write-Host "✅ Fichier .env.production mis à jour" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la mise à jour du fichier .env.production" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "`n🔐 Étape 2/3: Configuration de la variable d'environnement Netlify..." -ForegroundColor Cyan
try {
    netlify env:set NEXT_PUBLIC_API_URL "$ApiUrl" --force
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Variable d'environnement Netlify mise à jour" -ForegroundColor Green
    } else {
        throw "Erreur netlify env:set"
    }
} catch {
    Write-Host "❌ Erreur lors de la configuration Netlify" -ForegroundColor Red
    Write-Host "   Vérifiez que vous êtes connecté: netlify login" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

Write-Host "`n🚀 Étape 3/3: Redéploiement du frontend sur Netlify..." -ForegroundColor Cyan
Write-Host "   (Cela peut prendre 1-2 minutes)...`n" -ForegroundColor Yellow

try {
    netlify deploy --prod
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Déploiement réussi!" -ForegroundColor Green
    } else {
        throw "Erreur netlify deploy"
    }
} catch {
    Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ MISE À JOUR TERMINÉE AVEC SUCCÈS!                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "🌐 Frontend: " -NoNewline -ForegroundColor Cyan
Write-Host "https://libriassist.netlify.app" -ForegroundColor White

Write-Host "🔗 Backend via ngrok: " -NoNewline -ForegroundColor Cyan
Write-Host "$NgrokUrl/api/v1" -ForegroundColor White

Write-Host "`n💡 Testez le chatbot dans ~1 minute (le temps que le déploiement se propage)`n" -ForegroundColor Yellow
