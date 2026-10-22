@echo off
setlocal
cd /d "%~dp0"
title Aahan Gupta portfolio (dev)

if not exist node_modules (
  echo Installing packages, first run only...
  call npm install || (echo npm install failed & pause & exit /b 1)
)

rem Stop an earlier copy of this site (ports 5180 = site, 8787 = API). Port 5173 belongs to another project and is left alone.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5180 .*LISTENING" /C:":8787 .*LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo.
echo   Site:   http://localhost:5180
echo   Admin:  small ring at the bottom right of any page, password is ADMIN_PASSWORD in the .env file
echo   Stop:   press Ctrl+C in this window
echo.

rem Open the browser a few seconds after the servers start.
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:5180"

call npm run dev
pause
