@echo off
chcp 65001 >nul
cd /d "%~dp0"
python padbridge.py %*
if errorlevel 1 py padbridge.py %*
pause
