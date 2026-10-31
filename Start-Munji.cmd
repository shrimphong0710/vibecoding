@echo off
setlocal
set "MUNJI_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%MUNJI_NODE%" goto run
where node >nul 2>nul
if errorlevel 1 goto missing
set "MUNJI_NODE=node"
:run
"%MUNJI_NODE%" "%~dp0launch-munji.mjs"
if errorlevel 1 pause
exit /b
:missing
echo Node.js 20 or later is required to start Munji Studio.
pause
exit /b 1
