@echo off
title SIGNAL13 Restart

echo.
echo ====================================
echo      SIGNAL13 Restart
echo ====================================
echo.

call "%~dp0#2_STOP_SIGNAL13.bat"

powershell.exe -NoProfile -Command "Start-Sleep -Seconds 2"

call "%~dp0#1_START_SIGNAL13.bat"

exit /b %ERRORLEVEL%
