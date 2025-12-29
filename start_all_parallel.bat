@echo off
REM ============================================
REM  LibriAssist - Lancement Parallele Complet
REM  Optimise pour RTX 4070 Ti SUPER + 32GB RAM
REM ============================================

echo.
echo =========================================================
echo    LibriAssist - Mode Parallele Haute Performance
echo    RTX 4070 Ti SUPER (16GB VRAM) + 32GB RAM
echo =========================================================
echo.

REM Configuration Ollama pour parallelisme
set OLLAMA_NUM_PARALLEL=4
set OLLAMA_MAX_LOADED_MODELS=2
set OLLAMA_KEEP_ALIVE=30m
set OLLAMA_FLASH_ATTENTION=1
set OLLAMA_HOST=0.0.0.0:11434
set CUDA_VISIBLE_DEVICES=0

echo [1/4] Configuration Parallelisme:
echo       - Requetes paralleles : %OLLAMA_NUM_PARALLEL%
echo       - Modeles en memoire  : %OLLAMA_MAX_LOADED_MODELS%
echo       - Keep Alive          : %OLLAMA_KEEP_ALIVE%
echo       - Flash Attention     : Active
echo.

REM Arreter les processus existants
echo [2/4] Arret des processus existants...
taskkill /F /IM ollama.exe >nul 2>&1
taskkill /F /IM ollama_llama_server.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Demarrer Ollama
echo [3/4] Demarrage d'Ollama en mode parallele...
start "Ollama Server" /MIN "C:\Users\bbiendou\AppData\Local\Programs\Ollama\ollama.exe" serve

REM Attendre qu'Ollama soit pret
echo       Attente du demarrage d'Ollama...
:wait_ollama
timeout /t 2 /nobreak >nul
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 goto wait_ollama
echo       Ollama est pret!
echo.

REM Prechauffer Mistral
echo [4/4] Prechargement du modele Mistral...
curl -s -X POST http://localhost:11434/api/generate -d "{\"model\":\"mistral:latest\",\"prompt\":\"test\",\"stream\":false,\"options\":{\"num_predict\":1}}" >nul 2>&1
echo       Mistral charge en VRAM!
echo.

echo =========================================================
echo    Ollama est pret avec parallelisme active!
echo    Port: 11434
echo =========================================================
echo.

REM Demarrer le backend
echo Demarrage du Backend FastAPI...
cd /d D:\MesApplis\BiendouCorp\ChatBot\backend
start "LibriAssist Backend" /MIN "D:\MesApplis\BiendouCorp\ChatBot\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000

REM Attendre que le backend soit pret
echo Attente du backend...
:wait_backend
timeout /t 3 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 goto wait_backend
echo Backend pret!
echo.

REM Demarrer le Parallel Monitor
echo Demarrage du Parallel Monitor...
cd /d D:\MesApplis\BiendouCorp\ChatBot\parallel-monitor
start "Parallel Monitor" /MIN npm run dev

echo.
echo =========================================================
echo    TOUS LES SERVICES SONT PRETS!
echo =========================================================
echo.
echo    Ollama           : http://localhost:11434
echo    Backend API      : http://localhost:8000
echo    API Docs         : http://localhost:8000/docs
echo    Parallel Monitor : http://localhost:3001
echo.
echo    Optimisations actives:
echo    - 4 requetes LLM paralleles
echo    - Cache semantique
echo    - Request batching
echo    - Flash Attention (GPU)
echo.
echo Appuyez sur une touche pour ouvrir les interfaces...
pause >nul

start http://localhost:8000/docs
start http://localhost:3001
