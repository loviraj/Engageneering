@echo off
REM Engageneering — optional FastAPI backend (Render-style API)
REM Requires backend\.env copied from backend\.env.example

cd /d "%~dp0\backend"

if not exist ".env" (
  echo ERROR: backend\.env not found.
  echo   copy .env.example .env
  echo   then fill SUPABASE_*, JWT_SECRET, OAuth, SMTP values.
  pause
  exit /b 1
)

echo Starting API at http://localhost:8000
echo Docs: http://localhost:8000/docs  (if DEBUG=true in .env)
echo.

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -3 -m pip install -r requirements.txt -q
  py -3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
) else (
  pip install -r requirements.txt -q
  uvicorn main:app --reload --host 127.0.0.1 --port 8000
)

pause
