@echo off
REM Engageneering — local dev with Netlify Functions (payments, aria-moderate)
REM Requires: npm install -g netlify-cli
REM Env: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Netlify CLI env or .env

cd /d "%~dp0"

if not exist "config.js" (
  echo ERROR: config.js missing.
  pause
  exit /b 1
)

where netlify >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo Netlify CLI not found. Install with:
  echo   npm install -g netlify-cli
  pause
  exit /b 1
)

echo.
echo Starting netlify dev (static site + functions)...
echo Default URL is usually http://localhost:8888
echo.
netlify dev

pause
