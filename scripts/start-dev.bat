@echo off
rem Engageneering — development startup script (robust path handling)
rem Creates backend venv, installs dependencies, then starts backend and frontend servers

setlocal enableextensions enabledelayedexpansion

rem Resolve script and repo root directories
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "REPO_ROOT=%CD%"
set "BACKEND_DIR=%REPO_ROOT%\backend"

echo Starting dev environment from %REPO_ROOT%

if not exist "%BACKEND_DIR%" (
  echo ERROR: backend directory not found at %BACKEND_DIR%
  popd
  exit /b 1
)

rem Ensure backend venv exists
pushd "%BACKEND_DIR%"
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python venv in %BACKEND_DIR%\.venv
  python -m venv .venv
  echo Installing Python dependencies (this may take a few minutes)...
  "%CD%\.venv\Scripts\pip.exe" install -r requirements.txt
) else (
  echo Found existing venv
)

rem Start backend on localhost:8001 (avoid port 8080)
echo Launching backend on http://127.0.0.1:8001
start "Engageneering API" cmd /k "cd /d "%BACKEND_DIR%" && .venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8001"

popd

rem Start frontend static server on localhost:8000
echo Launching frontend static server on http://127.0.0.1:8000/platform.html
start "Engageneering Frontend" cmd /k "cd /d "%REPO_ROOT%" && python -m http.server 8000 --bind 127.0.0.1"

echo Dev servers started. This launcher window will remain open.
pause > nul

popd
