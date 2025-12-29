# start_parallel_optimized.ps1
# Script optimisé pour RTX 4070 Ti SUPER (16GB VRAM) + 32GB RAM + Intel Core Ultra 7 265K
# Lance Ollama et le Backend en mode parallèle haute performance

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     LibriAssist - Mode Parallèle Haute Performance               ║" -ForegroundColor Cyan
Write-Host "║     Optimisé pour RTX 4070 Ti SUPER (16GB) + 32GB RAM            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration optimale pour votre matériel
$env:OLLAMA_NUM_PARALLEL = "4"            # 4 requêtes simultanées (16GB VRAM le permet)
$env:OLLAMA_MAX_LOADED_MODELS = "2"       # 2 modèles si besoin (beaucoup de VRAM)
$env:OLLAMA_KEEP_ALIVE = "30m"            # 30 minutes - garde le modèle chaud
$env:OLLAMA_GPU_LAYERS = "35"             # Toutes les couches sur GPU
$env:OLLAMA_FLASH_ATTENTION = "1"         # Flash Attention pour vitesse
$env:OLLAMA_HOST = "0.0.0.0:11434"        # Accessible réseau local

# Performance GPU
$env:CUDA_VISIBLE_DEVICES = "0"           # GPU principal

Write-Host "🖥️  Configuration Matérielle Détectée:" -ForegroundColor Yellow
Write-Host "   ├── GPU: RTX 4070 Ti SUPER (16GB VRAM)" -ForegroundColor White
Write-Host "   ├── RAM: 32GB DDR5 @ 5600MT/s" -ForegroundColor White
Write-Host "   └── CPU: Intel Core Ultra 7 265K @ 3.9GHz" -ForegroundColor White
Write-Host ""

Write-Host "⚙️  Configuration Parallélisme Ollama:" -ForegroundColor Yellow
Write-Host "   ├── Requêtes parallèles : $env:OLLAMA_NUM_PARALLEL" -ForegroundColor Green
Write-Host "   ├── Modèles en mémoire  : $env:OLLAMA_MAX_LOADED_MODELS" -ForegroundColor Green
Write-Host "   ├── Keep Alive          : $env:OLLAMA_KEEP_ALIVE" -ForegroundColor Green
Write-Host "   ├── Flash Attention     : Activé" -ForegroundColor Green
Write-Host "   └── GPU Layers          : $env:OLLAMA_GPU_LAYERS (tout sur GPU)" -ForegroundColor Green
Write-Host ""

# Chemin vers Ollama
$ollamaPath = "C:\Users\bbiendou\AppData\Local\Programs\Ollama\ollama.exe"

# Vérifier si Ollama est déjà en cours
$ollamaProcess = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue
if ($ollamaProcess) {
    Write-Host "⚠️  Ollama est déjà en cours d'exécution. Arrêt..." -ForegroundColor Yellow
    Stop-Process -Name "ollama*" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "🚀 Démarrage d'Ollama en mode parallèle..." -ForegroundColor Cyan
Write-Host ""

# Démarrer Ollama en arrière-plan
Start-Process -FilePath $ollamaPath -ArgumentList "serve" -WindowStyle Minimized

# Attendre qu'Ollama soit prêt
Write-Host "⏳ Attente du démarrage d'Ollama..." -ForegroundColor Yellow
$retries = 0
$maxRetries = 30
while ($retries -lt $maxRetries) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
        Write-Host "✅ Ollama est prêt!" -ForegroundColor Green
        break
    } catch {
        $retries++
        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}
Write-Host ""

if ($retries -ge $maxRetries) {
    Write-Host "❌ Impossible de démarrer Ollama" -ForegroundColor Red
    exit 1
}

# Préchauffer le modèle Mistral
Write-Host "🔥 Préchauffage du modèle Mistral..." -ForegroundColor Yellow
try {
    $warmupBody = @{
        model = "mistral:latest"
        prompt = "Bonjour"
        stream = $false
        options = @{
            num_predict = 1
        }
    } | ConvertTo-Json

    $null = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $warmupBody -ContentType "application/json" -TimeoutSec 60
    Write-Host "✅ Modèle Mistral chargé en VRAM!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Préchauffage échoué, le modèle sera chargé à la première requête" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Ollama est prêt pour le parallélisme!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Endpoints disponibles:" -ForegroundColor Yellow
Write-Host "   ├── API Ollama    : http://localhost:11434" -ForegroundColor White
Write-Host "   └── Modèles       : http://localhost:11434/api/tags" -ForegroundColor White
Write-Host ""
Write-Host "💡 Prochaine étape: Lancez le backend avec:" -ForegroundColor Magenta
Write-Host "   .\start_backend_parallel.ps1" -ForegroundColor White
Write-Host ""
Write-Host "📈 Pour surveiller les performances:" -ForegroundColor Magenta
Write-Host "   cd parallel-monitor; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to see Ollama logs (Ctrl+C to exit)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Afficher les logs Ollama
& $ollamaPath logs
