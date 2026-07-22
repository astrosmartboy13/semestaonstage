@echo off
call "%~dp0config.bat"

echo ------------------------------------------
echo RUN_GATEWAY
echo ------------------------------------------

REM =====================================================
REM Cek apakah Gateway sudah hidup
REM =====================================================

powershell -command ^
"try { Invoke-WebRequest '%GATEWAY_HEALTH%' -UseBasicParsing ^| Out-Null; exit 0 } catch { exit 1 }"

if %errorlevel%==0 (
    echo Gateway already running.
    exit /b 0
)

echo Starting Gateway...

pushd "%GATEWAY_DIR%"

start "SIGNAL13 Gateway" cmd /k node "%GATEWAY_FILE%"

popd

exit /b 0
