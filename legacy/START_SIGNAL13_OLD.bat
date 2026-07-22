@echo off
setlocal

title SIGNAL13 Launcher
color 0A

echo ==========================================
echo          SIGNAL13 Launcher
echo ==========================================
echo.

:: ==========================================
:: Masuk Folder SIGNAL13
:: ==========================================

cd /d C:\SIGNAL13

:: ==========================================
:: Cek Cloudflare Tunnel
:: ==========================================

echo Checking Cloudflare Tunnel...

cloudflared.exe tunnel info signal13 | find "CONNECTOR ID" >nul

if errorlevel 1 (
    echo.
    echo [WARNING] Tunnel belum aktif.
    echo Tunggu beberapa detik...
    timeout /t 5 /nobreak >nul
) else (
    echo Tunnel Connected.
)

echo.

:: ==========================================
:: Jalankan OnTime jika belum berjalan
:: ==========================================

tasklist | find /I "ontime.exe" >nul

if errorlevel 1 (
    echo Starting OnTime...
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process 'C:\Program Files\ontime\ontime.exe'"
) else (
    echo OnTime sudah berjalan.
)

echo.
echo Waiting OnTime Server...

:CHECK

curl -s http://localhost:4001 >nul 2>&1

if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto CHECK
)

echo.
echo OnTime Ready.
echo.

:: ==========================================
:: Open Local Pages
:: ==========================================

echo Opening Local Pages...

start "" "http://localhost:4001/timer"
timeout /t 1 /nobreak >nul

start "" "http://localhost:4001/backstage/"
timeout /t 1 /nobreak >nul

start "" "http://localhost:4001/timeline/"
timeout /t 1 /nobreak >nul

start "" "http://localhost:4001/studio/"
timeout /t 1 /nobreak >nul

:: ==========================================
:: Open SIGNAL13 Dashboard
:: ==========================================

echo Opening SIGNAL13 Dashboard...

timeout /t 2 /nobreak >nul

start "" "https://semestaonstage.dpdns.org"

echo.
echo ==========================================
echo          SIGNAL13 READY
echo ==========================================
echo.

timeout /t 2 /nobreak >nul

endlocal
exit /b 0