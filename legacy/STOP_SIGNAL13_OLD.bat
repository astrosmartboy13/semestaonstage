@echo off
title SIGNAL13 Stop
color 0C

echo ==========================================
echo          SIGNAL13 Shutdown
echo ==========================================
echo.

echo Stopping OnTime...

taskkill /F /IM ontime.exe >nul 2>&1

echo.
echo ==========================================
echo      SIGNAL13 Successfully Stopped
echo ==========================================
echo.
echo Cloudflare Tunnel tetap aktif.
echo Tunnel akan otomatis digunakan lagi
echo saat START_SIGNAL13 dijalankan.
echo.

pause
exit