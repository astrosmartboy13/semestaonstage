@echo off

REM ==========================================
REM WAIT_HTTP
REM Usage:
REM call WAIT_HTTP.bat http://127.0.0.1:4001/
REM ==========================================

set URL=%~1

if "%URL%"=="" exit /b 1

:WAIT

powershell -command ^
"try { Invoke-WebRequest '%URL%' -UseBasicParsing ^| Out-Null; exit 0 } catch { exit 1 }"

if errorlevel 1 (
    timeout /t 1 >nul
    goto WAIT
)

exit /b 0
