@echo off
call "%~dp0config.bat"

echo ------------------------------------------
echo RUN_ONTIME
echo ------------------------------------------

powershell -NoProfile -Command ^
"try { Invoke-WebRequest '%ONTIME_URL%' -UseBasicParsing ^| Out-Null; exit 0 } catch { exit 1 }"

if %errorlevel%==0 (
    echo OnTime already running.
    exit /b 0
)

tasklist /FI "IMAGENAME eq ontime.exe" | find /I "ontime.exe" >nul

if %errorlevel%==0 (
    echo OnTime already running.
    exit /b 0
)

echo Starting OnTime...

start "" "%ONTIME_EXE%"

exit /b 0
