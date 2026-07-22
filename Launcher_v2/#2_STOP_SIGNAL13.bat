@echo off
title SIGNAL13 Shutdown

echo.
echo ====================================
echo      SIGNAL13 Shutdown
echo ====================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGNAL13_LAUNCHER_V2.ps1" -Action log -Component launcher -Message "STOP requested"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGNAL13_LAUNCHER_V2.ps1" -Action stop

echo.

echo SIGNAL13 Stop Completed.

powershell.exe -NoProfile -Command "Start-Sleep -Seconds 2"
exit /b 0
