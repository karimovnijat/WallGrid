@echo off
REM Starts the server and opens Chrome in kiosk mode across the wall (Windows).
REM Exact window size instead of kiosk: set WALL_W=5760 & set WALL_H=3240 & start.bat
cd /d "%~dp0"
if "%PORT%"=="" set PORT=8080
set URL=http://127.0.0.1:%PORT%/

start "wallgrid-server" /min node server.js
timeout /t 2 /nobreak >nul

set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" set CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" set CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe

set ARGS=--app=%URL% --user-data-dir="%~dp0.chrome-profile" --noerrdialogs --disable-infobars --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required
if not "%WALL_W%"=="" (
  start "" "%CHROME%" %ARGS% --window-position=0,0 --window-size=%WALL_W%,%WALL_H%
) else (
  start "" "%CHROME%" %ARGS% --kiosk
)
