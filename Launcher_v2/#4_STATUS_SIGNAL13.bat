@echo off
title SIGNAL13 Status

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGNAL13_LAUNCHER_V2.ps1" -Action status

pause
exit /b %ERRORLEVEL%
