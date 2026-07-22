@echo off

REM ==========================================
REM SIGNAL13 Launcher Configuration
REM ==========================================

set APP_NAME=SIGNAL13

REM ---------- PATH ----------

set ONTIME_EXE=C:\Program Files\ontime\ontime.exe

for %%I in ("%~dp0..") do set GATEWAY_DIR=%%~fI
set GATEWAY_FILE=gateway.js

set CLOUDFLARE_EXE=%GATEWAY_DIR%\tools\cloudflared.exe
set TUNNEL_NAME=signal13

REM ---------- URL ----------

set ONTIME_URL=http://localhost:4001/

set GATEWAY_HEALTH=http://localhost:8080/health

set LOCAL_EDITOR=http://localhost:4001/editor/
set LOCAL_TIMER=http://localhost:4001/timer/
set LOCAL_BACKSTAGE=http://localhost:4001/backstage/

set DASHBOARD=https://dashboard.semestaonstage.com
set TIMER=https://timer.semestaonstage.com
set ADMIN=https://admin.semestaonstage.com
