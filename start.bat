@echo off
echo Starting YouTube 2.0 Backend & Frontend...
echo.

start "Backend Server (Port 5000)" cmd /k "cd /d %~dp0server && npm run dev"
start "Frontend App (Port 3000)" cmd /k "cd /d %~dp0yourtube && npm run dev"

echo Backend and Frontend servers are starting in separate windows.
echo Frontend will be available at http://localhost:3000
echo.
