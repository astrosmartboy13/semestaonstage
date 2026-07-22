@echo off
title SIGNAL13 Launcher V2
color 0A

call "%~dp0config.bat"
set HELPER=%~dp0SIGNAL13_LAUNCHER_V2.ps1

cls
echo.
echo ==========================================
echo          SIGNAL13 Launcher V2
echo ==========================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HELPER%" -Action log -Component launcher -Message "START requested"

REM =====================================================
REM START ONTIME
REM =====================================================

echo [1/4] OnTime

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HELPER%" -Action begin -Component ontime -ProcessName ontime
call "%~dp0RUN_ONTIME.bat"

call "%~dp0WAIT_HTTP.bat" "%ONTIME_URL%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HELPER%" -Action register -Component ontime -ProcessName ontime -Port 4001

echo.

REM =====================================================
REM START GATEWAY
REM =====================================================

echo [2/4] Gateway

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HELPER%" -Action begin -Component gateway -ProcessName node
call "%~dp0RUN_GATEWAY.bat"

call "%~dp0WAIT_HTTP.bat" "%GATEWAY_HEALTH%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HELPER%" -Action register -Component gateway -ProcessName node -Port 8080

echo.

REM =====================================================
REM START TUNNEL
REM =====================================================

echo [3/4] Tunnel

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HELPER%" -Action begin -Component tunnel -ProcessName cloudflared
call "%~dp0RUN_TUNNEL.bat"

powershell.exe -NoProfile -Command "Start-Sleep -Seconds 3"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HELPER%" -Action register -Component tunnel -ProcessName cloudflared

echo.

REM =====================================================
REM OPEN DASHBOARD
REM =====================================================

echo [4/4] Opening Browser

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HELPER%" -Action browser

echo.
echo ==========================================
echo           SIGNAL13 READY
echo ==========================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HELPER%" -Action log -Component launcher -Message "SIGNAL13 READY"

powershell.exe -NoProfile -Command "Start-Sleep -Seconds 2"

exit /b 0
