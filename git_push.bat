@echo off
REM ENGAGENEERING™ — Git Update Script
REM Run from D:\engageneer\engageneering_repo\engageneering
REM Usage: double-click or run from Command Prompt

echo.
echo ENGAGENEERING™ — Pushing platform updates to GitHub
echo =====================================================
echo.

REM Navigate to repo
cd /d D:\engageneer\engageneering_repo\engageneering

REM Show current status
echo Current git status:
git status --short
echo.

REM Stage all changed HTML, JS, SQL files
git add platform.html
git add index.html
git add auth.html
git add assessment.html
git add framework.html
git add config.js
git add supabase\functions\aria-agent\index.ts

REM Stage SQL migrations if present in repo
if exist multilingual_migration.sql git add multilingual_migration.sql
if exist fix_all_rls.sql git add fix_all_rls.sql

REM Show what's staged
echo Files staged for commit:
git diff --cached --name-only
echo.

REM Commit with descriptive message
git commit -m "Platform v3: Video-only, multilingual, 2-phase ARIA scoring

- Removed Text Question from platform.html and index.html entirely
- Language selector in question modal (20 languages)
- Record button locked until language selected
- Hard duration enforcement: Q=60s, A=180s with countdown
- 2-phase ARIA: Phase 1 (Gatekeeper ~3s, blocks) + Phase 2 (background)
- Fixed needsText/needsVideo undefined bug causing Q not to save
- Fixed thumbUrl scope bug (was let inside block, now hoisted)
- Removed setType('text') call on modal open
- Language + all tags shown on question cards
- Language badge on non-English questions
- Video placeholder when thumbnail missing
- Language filter in feed bar (replaces Text format button)
- BASE query now fetches language + language_name columns
- Integrity Guard v2: 9 layers, PASS/WARN/HOLD/REJECT/ESCALATE
- ARIA agent v2 deployed with multilingual prompts
- multilingual_migration.sql: language columns + integrity_log table"

REM Push to GitHub
echo.
echo Pushing to GitHub...
git push origin main

echo.
echo =====================================================
echo Done. Check Netlify dashboard for deployment status.
echo https://app.netlify.com
echo =====================================================
echo.
pause
