@echo off
REM Engageneering — local static server (frontend)
REM Run from repo root: double-click or: start-local.bat

cd /d "%~dp0"

if not exist "config.js" (
  echo ERROR: config.js not found in project root.
  echo Copy from configtest.txt or create with SUPA_URL and SUPA_ANON.
  pause
  exit /b 1
)

echo.
echo Engageneering local server
echo ==========================
echo Serving: %CD%
echo.
echo Open in browser:
echo   http://localhost:8080/index.html
echo   http://localhost:8080/auth.html
echo   http://localhost:8080/platform.html
echo.
echo Press Ctrl+C to stop.
echo.

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -3 -m http.server 8080
) else (
  python -m http.server 8080
)

pause
